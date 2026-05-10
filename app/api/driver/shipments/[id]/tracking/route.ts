import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackingUpdates, shipments } from "@/lib/db/schema";
import { trackingUpdateSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

/**
 * POST /api/driver/shipments/[id]/tracking
 * Add a tracking update (location update) for a shipment.
 * DRIVER can only add updates to shipments linked to their transporter.
 * Body: { location: string (required), latitude?: number, longitude?: number }
 * Auto-generates createdAt timestamp.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["DRIVER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id: shipmentId } = await params;
    const { session } = authResult;
    const userTransporterId = (session.user as { transporterId?: string }).transporterId;

    if (!userTransporterId) {
      return NextResponse.json(
        { error: "No transporter account linked to this driver" },
        { status: 403 }
      );
    }

    // Verify the shipment exists and belongs to driver's transporter
    const [shipment] = await db
      .select({ id: shipments.id, transporterId: shipments.transporterId })
      .from(shipments)
      .where(eq(shipments.id, shipmentId))
      .limit(1);

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    if (shipment.transporterId !== userTransporterId) {
      return NextResponse.json(
        { error: "Forbidden: shipment not linked to your transporter" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = trackingUpdateSchema.safeParse({
      ...body,
      shipmentId,
    });

    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = issue.message;
        }
      }
      return NextResponse.json(
        { error: "Validation failed", fieldErrors },
        { status: 400 }
      );
    }

    const [trackingUpdate] = await db
      .insert(trackingUpdates)
      .values({
        shipmentId: validated.data.shipmentId,
        location: validated.data.location,
        latitude:
          validated.data.latitude != null
            ? String(validated.data.latitude)
            : null,
        longitude:
          validated.data.longitude != null
            ? String(validated.data.longitude)
            : null,
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
