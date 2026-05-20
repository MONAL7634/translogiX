import Link from "next/link";
import { headers } from "next/headers";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { ArrowRight, CheckCircle, Clock, IndianRupee, Package, Truck } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { routes, shipments, vehicles } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_BADGE_COLORS } from "@/lib/validations";

export default async function TransporterDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const transporterId = (session?.user as { transporterId?: string } | undefined)
    ?.transporterId;

  if (!session || !transporterId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Transporter Dashboard</h1>
        <p className="text-muted-foreground">
          No transporter account is linked to your profile. Please contact your administrator.
        </p>
      </div>
    );
  }

  const [vehicleCount, activeCount, deliveredCount, pendingCount, revenueRows, recentShipments] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(vehicles)
        .where(eq(vehicles.transporterId, transporterId)),
      db
        .select({ value: count() })
        .from(shipments)
        .where(
          and(
            eq(shipments.transporterId, transporterId),
            inArray(shipments.status, ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"])
          )
        ),
      db
        .select({ value: count() })
        .from(shipments)
        .where(and(eq(shipments.transporterId, transporterId), eq(shipments.status, "DELIVERED"))),
      db
        .select({ value: count() })
        .from(shipments)
        .where(and(eq(shipments.transporterId, transporterId), eq(shipments.status, "CREATED"))),
      db
        .select({ total: sql<string>`coalesce(sum(${routes.vendorRate}), 0)::text` })
        .from(shipments)
        .innerJoin(routes, eq(shipments.routeId, routes.id))
        .where(eq(shipments.transporterId, transporterId)),
      db
        .select({
          id: shipments.id,
          packageCode: shipments.packageCode,
          source: shipments.source,
          destination: shipments.destination,
          status: shipments.status,
        })
        .from(shipments)
        .where(eq(shipments.transporterId, transporterId))
        .orderBy(desc(shipments.createdAt))
        .limit(5),
    ]);

  const revenue = Number.parseFloat(revenueRows[0]?.total ?? "0");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transporter Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Fleet workload, assigned shipments, and payable route value.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric title="Vehicles" value={vehicleCount[0]?.value ?? 0} icon={Truck} />
        <Metric title="Active Shipments" value={activeCount[0]?.value ?? 0} icon={Package} />
        <Metric title="Pending" value={pendingCount[0]?.value ?? 0} icon={Clock} />
        <Metric title="Delivered" value={deliveredCount[0]?.value ?? 0} icon={CheckCircle} />
        <Metric
          title="Vendor Revenue"
          value={`₹${revenue.toLocaleString("en-IN")}`}
          icon={IndianRupee}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Shipments</CardTitle>
            <Link href="/transporter/shipments">
              <Button variant="outline" size="sm" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentShipments.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                No shipments are assigned to your transporter yet.
              </p>
            ) : (
              recentShipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{shipment.packageCode}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {shipment.source} to {shipment.destination}
                    </p>
                  </div>
                  <Badge className={STATUS_BADGE_COLORS[shipment.status]}>
                    {shipment.status.replace("_", " ")}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/transporter/shipments/new">
              <Button className="w-full justify-between" variant="outline">
                Create shipment <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/transporter/vehicles/new">
              <Button className="w-full justify-between" variant="outline">
                Add vehicle <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/transporter/vehicles">
              <Button className="w-full justify-between" variant="outline">
                Manage fleet <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: typeof Truck;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
