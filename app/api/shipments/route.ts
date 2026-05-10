import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shipments, transporters, vehicles } from "@/lib/db/schema";
import { shipmentApiSchema } from "@/lib/validations";
import { desc, ilike, or, and, eq } from "drizzle-orm";
import { requireTransporterScope } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  // Verify session — ADMIN sees all, TRANSPORTER sees own shipments
  const authResult = await requireTransporterScope(request);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const conditions = [];

    // Force-filter by session transporterId for TRANSPORTER role
    if (authResult.transporterId) {
      conditions.push(eq(shipments.transporterId, authResult.transporterId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(shipments.packageCode, `%${search}%`),
          ilike(shipments.source, `%${search}%`),
          ilike(shipments.destination, `%${search}%`)
        )
      );
    }

    const query = db
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
      .orderBy(desc(shipments.createdAt));

    const finalQuery =
      conditions.length > 0
        ? query.where(
            conditions.length === 1 ? conditions[0] : and(...conditions)
          )
        : query;

    const results = await finalQuery;

    return NextResponse.json({ shipments: results });
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify session — ADMIN or TRANSPORTER can create
  const authResult = await requireTransporterScope(request);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const validated = shipmentApiSchema.parse(body);

    // Force TRANSPORTER role to only create shipments for their own transporter
    const targetTransporterId =
      authResult.transporterId || validated.transporterId || null;

    const [shipment] = await db
      .insert(shipments)
      .values({
        packageCode: validated.packageCode,
        source: validated.source,
        destination: validated.destination,
        materialType: validated.materialType,
        grossWeightKg: String(validated.grossWeightKg),
        tareWeightKg: validated.tareWeightKg
          ? String(validated.tareWeightKg)
          : null,
        quantity: validated.quantity,
        pickupDate: validated.pickupDate,
        deliveryDeadline: validated.deliveryDeadline,
        transporterId: targetTransporterId,
        vehicleId: validated.vehicleId || null,
        routeId: validated.routeId || null,
        status: "CREATED",
      })
      .returning();

    // If a vehicle was assigned, update its status to BUSY
    if (validated.vehicleId) {
      await db
        .update(vehicles)
        .set({ status: "BUSY", updatedAt: new Date() })
        .where(eq(vehicles.id, validated.vehicleId));
    }

    return NextResponse.json({ shipment }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}
