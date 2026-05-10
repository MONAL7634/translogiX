import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routes, shipments } from "@/lib/db/schema";
import { routeUpdateApiSchema } from "@/lib/validations";
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
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, id));

    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ route });
  } catch (error) {
    console.error("Error fetching route:", error);
    return NextResponse.json(
      { error: "Failed to fetch route" },
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
    const validated = routeUpdateApiSchema.parse(body);

    const [existing] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(routes)
      .set({
        ...(validated.origin !== undefined && { origin: validated.origin }),
        ...(validated.destination !== undefined && { destination: validated.destination }),
        ...(validated.distanceKm !== undefined && { distanceKm: String(validated.distanceKm) }),
        ...(validated.estimatedTime !== undefined && { estimatedTime: validated.estimatedTime }),
        ...(validated.billingRate !== undefined && { billingRate: String(validated.billingRate) }),
        ...(validated.vendorRate !== undefined && { vendorRate: String(validated.vendorRate) }),
        updatedAt: new Date(),
      })
      .where(eq(routes.id, id))
      .returning();

    return NextResponse.json({ route: updated });
  } catch (error) {
    console.error("Error updating route:", error);
    return NextResponse.json(
      { error: "Failed to update route" },
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

    // Check if route is linked to any shipments
    const [shipmentCount] = await db
      .select({ count: count() })
      .from(shipments)
      .where(eq(shipments.routeId, id));

    if (shipmentCount.count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete route: ${shipmentCount.count} shipment(s) are linked to this route. Please remove or reassign all shipments before deleting.`,
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    await db.delete(routes).where(eq(routes.id, id));

    return NextResponse.json({ message: "Route deleted successfully" });
  } catch (error) {
    console.error("Error deleting route:", error);
    return NextResponse.json(
      { error: "Failed to delete route" },
      { status: 500 }
    );
  }
}
