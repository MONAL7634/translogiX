import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shipments } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const stats = await db
      .select({
        status: shipments.status,
        count: sql<number>`count(*)::int`,
      })
      .from(shipments)
      .groupBy(shipments.status);

    // Ensure all statuses are present even if count is 0
    const allStatuses = [
      "CREATED",
      "ASSIGNED",
      "PICKED_UP",
      "IN_TRANSIT",
      "DELIVERED",
      "CANCELLED",
    ] as const;

    const statsMap = new Map(stats.map((s) => [s.status, s.count]));
    const result = allStatuses.map((status) => ({
      status,
      count: statsMap.get(status) ?? 0,
    }));

    return NextResponse.json({ stats: result });
  } catch (error) {
    console.error("Error fetching shipment stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipment stats" },
      { status: 500 }
    );
  }
}
