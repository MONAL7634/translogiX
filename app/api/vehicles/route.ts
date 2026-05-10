import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles, transporters } from "@/lib/db/schema";
import { vehicleApiSchema } from "@/lib/validations";
import { desc, ilike, or, and, eq, sql } from "drizzle-orm";
import { requireTransporterScope } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  // Verify session and get transporter scope
  const authResult = await requireTransporterScope(request);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const query = db
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
      .orderBy(desc(vehicles.createdAt));

    const conditions = [];

    // Force-filter by session transporterId for TRANSPORTER role
    // This overrides any client-supplied transporterId
    if (authResult.transporterId) {
      conditions.push(eq(vehicles.transporterId, authResult.transporterId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(vehicles.vehicleNumber, `%${search}%`),
          ilike(transporters.name, `%${search}%`),
          sql`cast(${vehicles.vehicleType} as text) ilike ${`%${search}%`}`
        )
      );
    }

    let finalQuery = query;
    if (conditions.length > 0) {
      finalQuery = query.where(
        conditions.length === 1 ? conditions[0] : and(...conditions)
      ) as typeof query;
    }

    const results = await finalQuery;

    return NextResponse.json({ vehicles: results });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify session and get transporter scope
  const authResult = await requireTransporterScope(request);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const validated = vehicleApiSchema.parse(body);

    // Force TRANSPORTER role to only create vehicles for their own transporter
    const targetTransporterId = authResult.transporterId || validated.transporterId;

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        vehicleNumber: validated.vehicleNumber,
        transporterId: targetTransporterId,
        vehicleType: validated.vehicleType,
        capacityKg: validated.capacityKg,
        currentLocation: validated.currentLocation || null,
        status: validated.status || "AVAILABLE",
        lastMaintenanceDate: validated.lastMaintenanceDate || null,
      })
      .returning();

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
