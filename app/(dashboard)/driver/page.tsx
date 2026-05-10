import { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { shipments } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Driver Dashboard | TransLogiX",
  description: "Driver dashboard overview",
};

export default async function DriverDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const userTransporterId = (session.user as { transporterId?: string }).transporterId;

  if (!userTransporterId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Driver Dashboard</h1>
        <p className="text-muted-foreground">
          No transporter account is linked to your profile. Please contact your administrator.
        </p>
      </div>
    );
  }

  // Fetch counts for the driver's transporter
  const [totalResult] = await db
    .select({ value: count() })
    .from(shipments)
    .where(eq(shipments.transporterId, userTransporterId));

  const [activeResult] = await db
    .select({ value: count() })
    .from(shipments)
    .where(
      and(
        eq(shipments.transporterId, userTransporterId),
        eq(shipments.status, "IN_TRANSIT")
      )
    );

  const [deliveredResult] = await db
    .select({ value: count() })
    .from(shipments)
    .where(
      and(
        eq(shipments.transporterId, userTransporterId),
        eq(shipments.status, "DELIVERED")
      )
    );

  const [pendingResult] = await db
    .select({ value: count() })
    .from(shipments)
    .where(
      and(
        eq(shipments.transporterId, userTransporterId),
        eq(shipments.status, "PICKED_UP")
      )
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Driver Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResult.value}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeResult.value}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Picked Up</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingResult.value}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredResult.value}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Link */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="font-medium">Manage Your Shipments</p>
            <p className="text-sm text-muted-foreground">
              View assigned shipments, update status, and add location updates
            </p>
          </div>
          <Link href="/driver/shipments">
            <Button>
              View Shipments
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
