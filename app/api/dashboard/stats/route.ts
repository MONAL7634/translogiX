import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transporters, vehicles, shipments, routes } from "@/lib/db/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    // Run all aggregate queries in parallel
    const [
      totalTransportersResult,
      totalVehiclesResult,
      activeShipmentsResult,
      completedShipmentsResult,
      pendingShipmentsResult,
      revenueResult,
    ] = await Promise.all([
      // Total transporters count
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transporters),

      // Total vehicles count
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(vehicles),

      // Active shipments: status IN (CREATED, ASSIGNED, PICKED_UP, IN_TRANSIT)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(shipments)
        .where(
          inArray(shipments.status, [
            "CREATED",
            "ASSIGNED",
            "PICKED_UP",
            "IN_TRANSIT",
          ])
        ),

      // Completed shipments: status = DELIVERED
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(shipments)
        .where(eq(shipments.status, "DELIVERED")),

      // Pending shipments: status = CREATED
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(shipments)
        .where(eq(shipments.status, "CREATED")),

      // Revenue: SUM of billingRate from routes for shipments with assigned routes
      db
        .select({
          total: sql<string>`coalesce(sum(${routes.billingRate}), 0)::text`,
        })
        .from(shipments)
        .innerJoin(routes, eq(shipments.routeId, routes.id)),
    ]);

    return NextResponse.json({
      totalTransporters: totalTransportersResult[0]?.count ?? 0,
      totalVehicles: totalVehiclesResult[0]?.count ?? 0,
      activeShipments: activeShipmentsResult[0]?.count ?? 0,
      completedShipments: completedShipmentsResult[0]?.count ?? 0,
      pendingShipments: pendingShipmentsResult[0]?.count ?? 0,
      revenue: revenueResult[0]?.total ?? "0",
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
