import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shipments, transporters, vehicles } from "@/lib/db/schema";
import {
  shipmentUpdateApiSchema,
  shipmentStatusUpdateSchema,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/validations";
import { eq } from "drizzle-orm";
import { requireRole, verifyOwnership } from "@/lib/auth/api-utils";
import {
  getShipmentStatusAfterVehicleAssignment,
  getVehicleAssignmentBlocker,
  shouldReleaseVehicleForStatus,
  syncVehicleStatusFromActiveShipments,
  type ShipmentStatus,
} from "@/lib/shipment-vehicle-rules";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify session — ADMIN or TRANSPORTER can access
  const authResult = await requireRole(request, ["ADMIN", "TRANSPORTER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const [shipment] = await db
      .select({
        id: shipments.id,
        packageCode: shipments.packageCode,
        source: shipments.source,
        destination: shipments.destination,
        materialType: shipments.materialType,
        grossWeightKg: shipments.grossWeightKg,
        tareWeightKg: shipments.tareWeightKg,
        quantity: shipments.quantity,
        pickupDate: shipments.pickupDate,
        deliveryDeadline: shipments.deliveryDeadline,
        transporterId: shipments.transporterId,
        vehicleId: shipments.vehicleId,
        routeId: shipments.routeId,
        status: shipments.status,
        createdAt: shipments.createdAt,
        updatedAt: shipments.updatedAt,
        transporterName: transporters.name,
        vehicleNumber: vehicles.vehicleNumber,
      })
      .from(shipments)
      .leftJoin(transporters, eq(shipments.transporterId, transporters.id))
      .leftJoin(vehicles, eq(shipments.vehicleId, vehicles.id))
      .where(eq(shipments.id, id));

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Verify TRANSPORTER owns this shipment
    const ownershipError = verifyOwnership(
      authResult.session,
      shipment.transporterId
    );
    if (ownershipError) return ownershipError;

    return NextResponse.json({ shipment });
  } catch (error) {
    console.error("Error fetching shipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipment" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify session — ADMIN or TRANSPORTER can access
  const authResult = await requireRole(request, ["ADMIN", "TRANSPORTER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Verify TRANSPORTER owns this shipment
    const ownershipError = verifyOwnership(
      authResult.session,
      existing.transporterId
    );
    if (ownershipError) return ownershipError;

    // Check if this is a status update or a general update
    if ("status" in body && Object.keys(body).length === 1) {
      const statusUpdate = shipmentStatusUpdateSchema.parse(body);
      const validNext = VALID_STATUS_TRANSITIONS[existing.status] || [];

      if (!validNext.includes(statusUpdate.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${statusUpdate.status}. Valid next states: ${validNext.length > 0 ? validNext.join(", ") : "none (terminal state)"}`,
          },
          { status: 400 }
        );
      }

      if (statusUpdate.status === "ASSIGNED" && existing.vehicleId) {
        const vehicleCheck = await getVehicleAssignmentBlocker(existing.vehicleId, id);
        if (vehicleCheck.error) {
          return NextResponse.json(
            { error: vehicleCheck.error },
            { status: vehicleCheck.status ?? 400 }
          );
        }
      }

      const [updated] = await db
        .update(shipments)
        .set({
          status: statusUpdate.status,
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, id))
        .returning();

      // When vehicle is assigned (status -> ASSIGNED with vehicleId), ensure vehicle is BUSY
      if (updated.vehicleId && statusUpdate.status === "ASSIGNED") {
        await db
          .update(vehicles)
          .set({ status: "BUSY", updatedAt: new Date() })
          .where(eq(vehicles.id, updated.vehicleId));
      }

      // When shipment exits active service, release the vehicle only if no other
      // active shipment still references it.
      if (
        shouldReleaseVehicleForStatus(statusUpdate.status as ShipmentStatus) &&
        updated.vehicleId
      ) {
        await syncVehicleStatusFromActiveShipments(updated.vehicleId);
      }

      return NextResponse.json({ shipment: updated });
    }

    // General update (reassign vehicle/route etc.)
    const validated = shipmentUpdateApiSchema.parse(body);

    // Track old vehicleId to update statuses
    const oldVehicleId = existing.vehicleId;
    const newVehicleId =
      validated.vehicleId !== undefined
        ? validated.vehicleId || null
        : existing.vehicleId;
    const targetTransporterId =
      validated.transporterId !== undefined
        ? validated.transporterId || null
        : existing.transporterId;

    if (
      validated.vehicleId !== undefined &&
      !newVehicleId &&
      (existing.status === "PICKED_UP" || existing.status === "IN_TRANSIT")
    ) {
      return NextResponse.json(
        { error: "Cannot remove a vehicle from a picked up or in-transit shipment" },
        { status: 400 }
      );
    }

    if (newVehicleId && newVehicleId !== oldVehicleId) {
      const vehicleCheck = await getVehicleAssignmentBlocker(newVehicleId, id);
      if (vehicleCheck.error) {
        return NextResponse.json(
          { error: vehicleCheck.error },
          { status: vehicleCheck.status ?? 400 }
        );
      }

      const vehicle = vehicleCheck.vehicle;
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
      const userRole = (authResult.session.user as { role?: string }).role;
      if (userRole === "TRANSPORTER" && vehicle.transporterId !== existing.transporterId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (targetTransporterId && vehicle.transporterId !== targetTransporterId) {
        return NextResponse.json(
          { error: "Vehicle does not belong to the selected transporter" },
          { status: 400 }
        );
      }
    }

    const nextStatus =
      newVehicleId && existing.status === "CREATED"
        ? getShipmentStatusAfterVehicleAssignment(existing.status)
        : !newVehicleId && existing.status === "ASSIGNED"
          ? "CREATED"
          : existing.status;

    const [updated] = await db
      .update(shipments)
      .set({
        ...(validated.packageCode !== undefined && {
          packageCode: validated.packageCode,
        }),
        ...(validated.source !== undefined && { source: validated.source }),
        ...(validated.destination !== undefined && {
          destination: validated.destination,
        }),
        ...(validated.materialType !== undefined && {
          materialType: validated.materialType,
        }),
        ...(validated.grossWeightKg !== undefined && {
          grossWeightKg: String(validated.grossWeightKg),
        }),
        ...(validated.tareWeightKg !== undefined && {
          tareWeightKg: validated.tareWeightKg
            ? String(validated.tareWeightKg)
            : null,
        }),
        ...(validated.quantity !== undefined && {
          quantity: validated.quantity,
        }),
        ...(validated.pickupDate !== undefined && {
          pickupDate: validated.pickupDate,
        }),
        ...(validated.deliveryDeadline !== undefined && {
          deliveryDeadline: validated.deliveryDeadline,
        }),
        ...(validated.transporterId !== undefined && {
          transporterId: validated.transporterId || null,
        }),
        ...(validated.vehicleId !== undefined && {
          vehicleId: validated.vehicleId || null,
        }),
        ...(validated.routeId !== undefined && {
          routeId: validated.routeId || null,
        }),
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id))
      .returning();

    // If vehicle assignment changed, update vehicle statuses
    if (validated.vehicleId !== undefined) {
      // Release old vehicle if it was different
      if (oldVehicleId && oldVehicleId !== newVehicleId) {
        await syncVehicleStatusFromActiveShipments(oldVehicleId);
      }
      // Set new vehicle to BUSY
      if (newVehicleId && newVehicleId !== oldVehicleId) {
        await db
          .update(vehicles)
          .set({ status: "BUSY", updatedAt: new Date() })
          .where(eq(vehicles.id, newVehicleId));
      }
    }

    return NextResponse.json({ shipment: updated });
  } catch (error) {
    console.error("Error updating shipment:", error);
    return NextResponse.json(
      { error: "Failed to update shipment" },
      { status: 500 }
    );
  }
}
