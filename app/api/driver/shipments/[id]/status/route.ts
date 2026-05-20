import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shipments, vehicles } from "@/lib/db/schema";
import { shipmentStatusUpdateSchema, VALID_STATUS_TRANSITIONS } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";
import {
  getVehicleAssignmentBlocker,
  shouldReleaseVehicleForStatus,
  syncVehicleStatusFromActiveShipments,
  type ShipmentStatus,
} from "@/lib/shipment-vehicle-rules";

/**
 * PATCH /api/driver/shipments/[id]/status
 * Update the status of a shipment. DRIVER can only update shipments linked to their transporter.
 * Validates status transitions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["DRIVER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const { session } = authResult;
    const userTransporterId = (session.user as { transporterId?: string }).transporterId;

    if (!userTransporterId) {
      return NextResponse.json(
        { error: "No transporter account linked to this driver" },
        { status: 403 }
      );
    }

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

    // Verify driver's transporter owns this shipment
    if (existing.transporterId !== userTransporterId) {
      return NextResponse.json(
        { error: "Forbidden: shipment not linked to your transporter" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const statusUpdate = shipmentStatusUpdateSchema.safeParse(body);

    if (!statusUpdate.success) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const validNext = VALID_STATUS_TRANSITIONS[existing.status] || [];

    if (!validNext.includes(statusUpdate.data.status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${existing.status} to ${statusUpdate.data.status}. Valid next states: ${validNext.length > 0 ? validNext.join(", ") : "none (terminal state)"}`,
        },
        { status: 400 }
      );
    }

    if (statusUpdate.data.status === "ASSIGNED" && existing.vehicleId) {
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
        status: statusUpdate.data.status,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id))
      .returning();

    // When vehicle is assigned (status → ASSIGNED with vehicleId), ensure vehicle is BUSY
    if (updated.vehicleId && statusUpdate.data.status === "ASSIGNED") {
      await db
        .update(vehicles)
        .set({ status: "BUSY", updatedAt: new Date() })
        .where(eq(vehicles.id, updated.vehicleId));
    }

    // When shipment leaves active service, release the vehicle only if no other
    // active shipment still references it.
    if (
      shouldReleaseVehicleForStatus(statusUpdate.data.status as ShipmentStatus) &&
      updated.vehicleId
    ) {
      await syncVehicleStatusFromActiveShipments(updated.vehicleId);
    }

    return NextResponse.json({ shipment: updated });
  } catch (error) {
    console.error("Error updating shipment status:", error);
    return NextResponse.json(
      { error: "Failed to update shipment status" },
      { status: 500 }
    );
  }
}
