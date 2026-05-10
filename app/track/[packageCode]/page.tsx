import { db } from "@/lib/db";
import { shipments, trackingUpdates, vehicles, transporters } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { TrackingResult } from "./tracking-result";
import Link from "next/link";

interface PageProps {
  params: Promise<{ packageCode: string }>;
}

export default async function TrackPackagePage({ params }: PageProps) {
  const { packageCode } = await params;
  const decodedCode = decodeURIComponent(packageCode);

  // Fetch shipment with vehicle and transporter info
  const [shipment] = await db
    .select({
      id: shipments.id,
      packageCode: shipments.packageCode,
      source: shipments.source,
      destination: shipments.destination,
      status: shipments.status,
      materialType: shipments.materialType,
      vehicleNumber: vehicles.vehicleNumber,
      transporterName: transporters.name,
    })
    .from(shipments)
    .leftJoin(vehicles, eq(shipments.vehicleId, vehicles.id))
    .leftJoin(transporters, eq(shipments.transporterId, transporters.id))
    .where(eq(shipments.packageCode, decodedCode))
    .limit(1);

  if (!shipment) {
    return <NotFoundState packageCode={decodedCode} />;
  }

  // Fetch tracking updates ordered by createdAt descending (newest first)
  const updates = await db
    .select({
      id: trackingUpdates.id,
      location: trackingUpdates.location,
      latitude: trackingUpdates.latitude,
      longitude: trackingUpdates.longitude,
      createdAt: trackingUpdates.createdAt,
    })
    .from(trackingUpdates)
    .where(eq(trackingUpdates.shipmentId, shipment.id))
    .orderBy(desc(trackingUpdates.createdAt));

  return (
    <TrackingResult
      shipment={{
        packageCode: shipment.packageCode,
        source: shipment.source,
        destination: shipment.destination,
        status: shipment.status,
        vehicleNumber: shipment.vehicleNumber,
        transporterName: shipment.transporterName,
      }}
      trackingUpdates={updates.map((u) => ({
        id: u.id,
        location: u.location,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}

function NotFoundState({ packageCode }: { packageCode: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-muted-foreground"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">Package not found</h2>
        <p className="text-sm text-muted-foreground">
          No shipment found for code &ldquo;{packageCode}&rdquo;.
          Please check the code and try again.
        </p>
      </div>
      <Link
        href="/track"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Try another code
      </Link>
    </div>
  );
}
