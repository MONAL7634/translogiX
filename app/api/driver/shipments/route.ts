import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shipments, transporters, vehicles } from "@/lib/db/schema";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

/**
 * GET /api/driver/shipments?search=xxx
 * Fetch shipments assigned to the logged-in driver's transporter.
 * DRIVER role: filtered by transporterId matching user's transporter.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["DRIVER"]);
  if (authResult.error) return authResult.error;

  try {
    const { session } = authResult;
    const userTransporterId = (session.user as { transporterId?: string }).transporterId;

    if (!userTransporterId) {
      return NextResponse.json(
        { error: "No transporter account linked to this driver" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const conditions = [
      eq(shipments.transporterId, userTransporterId),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(shipments.packageCode, `%${search}%`),
          ilike(shipments.source, `%${search}%`),
          ilike(shipments.destination, `%${search}%`)
        )!
      );
    }

    const results = await db
      .select({
        id: shipments.id,
        packageCode: shipments.packageCode,
        source: shipments.source,
        destination: shipments.destination,
        materialType: shipments.materialType,
        grossWeightKg: shipments.grossWeightKg,
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
      .where(and(...conditions))
      .orderBy(desc(shipments.createdAt));

    return NextResponse.json({ shipments: results });
  } catch (error) {
    console.error("Error fetching driver shipments:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}
