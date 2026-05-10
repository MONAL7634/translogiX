import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles, transporters } from "@/lib/db/schema";
import { vehicleApiSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { requireRole, verifyOwnership } from "@/lib/auth/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify session — ADMIN or TRANSPORTER can access
  const authResult = await requireRole(request, ["ADMIN", "TRANSPORTER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const [vehicle] = await db
      .select({
        id: vehicles.id,
        vehicleNumber: vehicles.vehicleNumber,
        transporterId: vehicles.transporterId,
        transporterName: transporters.name,
        vehicleType: vehicles.vehicleType,
        capacityKg: vehicles.capacityKg,
        currentLocation: vehicles.currentLocation,
        status: vehicles.status,
        lastMaintenanceDate: vehicles.lastMaintenanceDate,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
      })
      .from(vehicles)
      .innerJoin(transporters, eq(vehicles.transporterId, transporters.id))
      .where(eq(vehicles.id, id));

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Verify TRANSPORTER owns this vehicle
    const ownershipError = verifyOwnership(authResult.session, vehicle.transporterId);
    if (ownershipError) return ownershipError;

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
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
    const validated = vehicleApiSchema.partial().parse(body);

    const [existing] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Verify TRANSPORTER owns this vehicle
    const ownershipError = verifyOwnership(authResult.session, existing.transporterId);
    if (ownershipError) return ownershipError;

    // TRANSPORTER cannot reassign vehicle to a different transporter
    if (validated.transporterId) {
      const userRole = (authResult.session.user as { role?: string }).role;
      if (userRole === "TRANSPORTER") {
        const userTransporterId = (authResult.session.user as { transporterId?: string }).transporterId;
        if (validated.transporterId !== userTransporterId) {
          return NextResponse.json(
            { error: "Cannot reassign vehicle to a different transporter" },
            { status: 403 }
          );
        }
      }
    }

    const [updated] = await db
      .update(vehicles)
      .set({
        ...(validated.vehicleNumber !== undefined && { vehicleNumber: validated.vehicleNumber }),
        ...(validated.transporterId !== undefined && { transporterId: validated.transporterId }),
        ...(validated.vehicleType !== undefined && { vehicleType: validated.vehicleType }),
        ...(validated.capacityKg !== undefined && { capacityKg: validated.capacityKg }),
        ...(validated.currentLocation !== undefined && { currentLocation: validated.currentLocation || null }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.lastMaintenanceDate !== undefined && { lastMaintenanceDate: validated.lastMaintenanceDate || null }),
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id))
      .returning();

    return NextResponse.json({ vehicle: updated });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify session — ADMIN or TRANSPORTER can access
  const authResult = await requireRole(request, ["ADMIN", "TRANSPORTER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Verify TRANSPORTER owns this vehicle
    const ownershipError = verifyOwnership(authResult.session, existing.transporterId);
    if (ownershipError) return ownershipError;

    await db.delete(vehicles).where(eq(vehicles.id, id));

    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
