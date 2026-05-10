import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shipments, transporters } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const recentShipments = await db
      .select({
        id: shipments.id,
        packageCode: shipments.packageCode,
        source: shipments.source,
        destination: shipments.destination,
        status: shipments.status,
        transporterName: transporters.name,
        createdAt: shipments.createdAt,
      })
      .from(shipments)
      .leftJoin(transporters, eq(shipments.transporterId, transporters.id))
      .orderBy(desc(shipments.createdAt))
      .limit(10);

    return NextResponse.json({ shipments: recentShipments });
  } catch (error) {
    console.error("Error fetching recent shipments:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent shipments" },
      { status: 500 }
    );
  }
}
