import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackingUpdates, shipments } from "@/lib/db/schema";
import { trackingUpdateSchema } from "@/lib/validations";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/tracking-updates?shipmentId=xxx
 * Fetch all tracking updates for a shipment (public endpoint — no auth required).
 * Ordered by createdAt descending (newest first).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get("shipmentId");

    if (!shipmentId) {
      return NextResponse.json(
        { error: "shipmentId query parameter is required" },
        { status: 400 }
      );
    }

    const updates = await db
      .select({
        id: trackingUpdates.id,
        shipmentId: trackingUpdates.shipmentId,
        location: trackingUpdates.location,
        latitude: trackingUpdates.latitude,
        longitude: trackingUpdates.longitude,
        createdAt: trackingUpdates.createdAt,
      })
      .from(trackingUpdates)
      .where(eq(trackingUpdates.shipmentId, shipmentId))
      .orderBy(desc(trackingUpdates.createdAt));

    return NextResponse.json({ trackingUpdates: updates });
  } catch (error) {
    console.error("Error fetching tracking updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking updates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracking-updates
 * Add a new tracking update. Requires authentication (ADMIN, DRIVER, or TRANSPORTER role).
 * Body: { shipmentId, location, latitude?, longitude? }
 * Auto-generates createdAt timestamp.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = trackingUpdateSchema.parse(body);

    // Verify the shipment exists
    const [shipment] = await db
      .select({ id: shipments.id })
      .from(shipments)
      .where(eq(shipments.id, validated.shipmentId))
      .limit(1);

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    const [trackingUpdate] = await db
      .insert(trackingUpdates)
      .values({
        shipmentId: validated.shipmentId,
        location: validated.location,
        latitude: validated.latitude != null ? String(validated.latitude) : null,
        longitude: validated.longitude != null ? String(validated.longitude) : null,
      })
      .returning();

    return NextResponse.json({ trackingUpdate }, { status: 201 });
  } catch (error) {
    console.error("Error creating tracking update:", error);
    return NextResponse.json(
      { error: "Failed to create tracking update" },
      { status: 500 }
    );
  }
}
