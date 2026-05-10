import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transporters, vehicles } from "@/lib/db/schema";
import { transporterSchema } from "@/lib/validations";
import { eq, count } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify session and ADMIN role
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const [transporter] = await db
      .select()
      .from(transporters)
      .where(eq(transporters.id, id));

    if (!transporter) {
      return NextResponse.json(
        { error: "Transporter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ transporter });
  } catch (error) {
    console.error("Error fetching transporter:", error);
    return NextResponse.json(
      { error: "Failed to fetch transporter" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify session and ADMIN role
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = transporterSchema.partial().parse(body);

    const [existing] = await db
      .select()
      .from(transporters)
      .where(eq(transporters.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Transporter not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(transporters)
      .set({
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.gstNumber !== undefined && { gstNumber: validated.gstNumber || null }),
        ...(validated.contactPerson !== undefined && { contactPerson: validated.contactPerson }),
        ...(validated.phone !== undefined && { phone: validated.phone }),
        ...(validated.email !== undefined && { email: validated.email || null }),
        ...(validated.status !== undefined && { status: validated.status }),
        updatedAt: new Date(),
      })
      .where(eq(transporters.id, id))
      .returning();

    return NextResponse.json({ transporter: updated });
  } catch (error) {
    console.error("Error updating transporter:", error);
    return NextResponse.json(
      { error: "Failed to update transporter" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify session and ADMIN role
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    // Check if transporter has linked vehicles
    const [vehicleCount] = await db
      .select({ count: count() })
      .from(vehicles)
      .where(eq(vehicles.transporterId, id));

    if (vehicleCount.count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete transporter: ${vehicleCount.count} vehicle(s) are linked to this transporter. Please remove or reassign all vehicles before deleting.`,
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(transporters)
      .where(eq(transporters.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Transporter not found" },
        { status: 404 }
      );
    }

    await db.delete(transporters).where(eq(transporters.id, id));

    return NextResponse.json({ message: "Transporter deleted successfully" });
  } catch (error) {
    console.error("Error deleting transporter:", error);
    return NextResponse.json(
      { error: "Failed to delete transporter" },
      { status: 500 }
    );
  }
}
