import { Metadata } from "next";
import { db } from "@/lib/db";
import {
  shipments,
  trackingUpdates,
  vehicles,
  transporters,
  routes,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  Route,
  Weight,
  Hash,
  Calendar,
  Clock,
  CircleDot,
  User,
} from "lucide-react";
import Link from "next/link";
import { STATUS_BADGE_COLORS } from "@/lib/validations";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const [shipment] = await db
      .select({ packageCode: shipments.packageCode })
      .from(shipments)
      .where(eq(shipments.id, id))
      .limit(1);

    return {
      title: shipment
        ? `${shipment.packageCode} | Shipments | TransLogiX`
        : "Shipment Not Found | TransLogiX",
      description: shipment
        ? `Details for shipment ${shipment.packageCode}`
        : "Shipment not found",
    };
  } catch {
    return {
      title: "Shipment Not Found | TransLogiX",
      description: "Shipment not found",
    };
  }
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(isoString: Date | string): string {
  const date = new Date(isoString);
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} at ${date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function StatusBadge({ status }: { status: string }) {
  const colorClass =
    STATUS_BADGE_COLORS[status] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

  return (
    <Badge className={`${colorClass} text-sm font-medium px-3 py-0.5`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
        {icon}
        {label}
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch shipment with transporter, vehicle, and route info
  let shipment: {
    id: string;
    packageCode: string;
    source: string;
    destination: string;
    materialType: string;
    grossWeightKg: string;
    tareWeightKg: string | null;
    quantity: number;
    pickupDate: string;
    deliveryDeadline: string;
    transporterId: string | null;
    vehicleId: string | null;
    routeId: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    transporterName: string | null;
    vehicleNumber: string | null;
    routeOrigin: string | null;
    routeDestination: string | null;
    routeDistanceKm: string | null;
    routeEstimatedTime: string | null;
  } | undefined;

  try {
    [shipment] = await db
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
        routeOrigin: routes.origin,
        routeDestination: routes.destination,
        routeDistanceKm: routes.distanceKm,
        routeEstimatedTime: routes.estimatedTime,
      })
      .from(shipments)
      .leftJoin(transporters, eq(shipments.transporterId, transporters.id))
      .leftJoin(vehicles, eq(shipments.vehicleId, vehicles.id))
      .leftJoin(routes, eq(shipments.routeId, routes.id))
      .where(eq(shipments.id, id))
      .limit(1);
  } catch {
    // Invalid UUID format or other DB error
    return <NotFoundState />;
  }

  if (!shipment) {
    return <NotFoundState />;
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
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/admin/shipments">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Shipments
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Package className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">
            {shipment.packageCode}
          </h1>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      {/* Shipment details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField
          label="Source"
          value={shipment.source}
          icon={<MapPin className="h-4 w-4" />}
        />
        <DetailField
          label="Destination"
          value={shipment.destination}
          icon={<MapPin className="h-4 w-4" />}
        />
        <DetailField
          label="Material Type"
          value={shipment.materialType}
          icon={<Package className="h-4 w-4" />}
        />
        <DetailField
          label="Gross Weight"
          value={`${Number(shipment.grossWeightKg).toLocaleString()} kg`}
          icon={<Weight className="h-4 w-4" />}
        />
        {shipment.tareWeightKg && (
          <DetailField
            label="Tare Weight"
            value={`${Number(shipment.tareWeightKg).toLocaleString()} kg`}
            icon={<Weight className="h-4 w-4" />}
          />
        )}
        <DetailField
          label="Quantity"
          value={String(shipment.quantity)}
          icon={<Hash className="h-4 w-4" />}
        />
        <DetailField
          label="Pickup Date"
          value={formatDate(shipment.pickupDate)}
          icon={<Calendar className="h-4 w-4" />}
        />
        <DetailField
          label="Delivery Deadline"
          value={formatDate(shipment.deliveryDeadline)}
          icon={<Calendar className="h-4 w-4" />}
        />
        <DetailField
          label="Created"
          value={formatDate(shipment.createdAt.toISOString())}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Assigned Transporter */}
      <div className="rounded-lg border p-4">
        <h2 className="text-base font-semibold mb-3">Assigned Transporter</h2>
        {shipment.transporterName ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {shipment.transporterName}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No transporter assigned
          </p>
        )}
      </div>

      {/* Assigned Vehicle */}
      <div className="rounded-lg border p-4">
        <h2 className="text-base font-semibold mb-3">Assigned Vehicle</h2>
        {shipment.vehicleNumber ? (
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {shipment.vehicleNumber}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No vehicle assigned
          </p>
        )}
      </div>

      {/* Assigned Route */}
      <div className="rounded-lg border p-4">
        <h2 className="text-base font-semibold mb-3">Assigned Route</h2>
        {shipment.routeOrigin && shipment.routeDestination ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {shipment.routeOrigin} → {shipment.routeDestination}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {shipment.routeDistanceKm && (
                <span>Distance: {Number(shipment.routeDistanceKm).toLocaleString()} km</span>
              )}
              {shipment.routeEstimatedTime && (
                <span>Est. Time: {shipment.routeEstimatedTime}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No route assigned</p>
        )}
      </div>

      {/* Tracking History Timeline */}
      <div>
        <h2 className="text-base font-semibold mb-4">Tracking History</h2>
        {updates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-foreground/15 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No tracking updates yet. Updates will appear here as the shipment
              progresses.
            </p>
          </div>
        ) : (
          <div
            className="relative pl-6"
            role="list"
            aria-label="Tracking timeline"
          >
            {/* Vertical line */}
            <div
              className="absolute left-[7px] top-2 bottom-2 w-px bg-foreground/10"
              aria-hidden="true"
            />

            <ol className="flex flex-col gap-4">
              {updates.map((update, index) => (
                <li
                  key={update.id}
                  className="relative flex gap-3"
                  role="listitem"
                >
                  {/* Timeline dot */}
                  <div
                    className="absolute -left-6 top-1 z-10 flex h-[15px] w-[15px] items-center justify-center"
                    aria-hidden="true"
                  >
                    {index === 0 ? (
                      <CircleDot className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <div className="h-[7px] w-[7px] rounded-full bg-foreground/25" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-1">
                    <p className="text-sm font-medium leading-snug">
                      {update.location}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(update.createdAt)}
                    </p>
                    {(update.latitude || update.longitude) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Coordinates: {update.latitude}, {update.longitude}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="rounded-full bg-muted p-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">Shipment not found</h2>
        <p className="text-sm text-muted-foreground">
          The shipment you are looking for does not exist or may have been
          removed.
        </p>
      </div>
      <Link href="/admin/shipments">
        <Button>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shipments
        </Button>
      </Link>
    </div>
  );
}
