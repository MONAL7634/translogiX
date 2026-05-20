import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, MapPin, PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CustomerDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Track shipment movement and delivery status in real time.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="truncate text-lg font-semibold">{session?.user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{session?.user.email}</p>
          </div>
          <Link href="/customer/track">
            <Button className="gap-2">
              Track a Shipment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          title="Package Lookup"
          icon={PackageSearch}
          text="Enter a package code to see its latest status, vehicle, transporter, and timeline."
        />
        <InfoCard
          title="Live Updates"
          icon={MapPin}
          text="Driver location updates appear on the public tracking timeline as soon as they are submitted."
        />
        <InfoCard
          title="Delivery Trail"
          icon={ShieldCheck}
          text="Delivered shipments keep their full history, so you can confirm the route after completion."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Need a package code?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Package codes are generated when an admin or transporter creates a shipment.
            Ask your logistics contact for the code, then use the tracker to fetch live data.
          </p>
          <Link href="/track" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
            Open public tracker <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon: typeof PackageSearch;
}) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
