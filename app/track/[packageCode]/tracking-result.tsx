"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE_COLORS } from "@/lib/validations";
import {
  MapPin,
  Clock,
  Truck,
  CircleDot,
  ArrowLeft,
  Package,
} from "lucide-react";
import Link from "next/link";

interface TrackingUpdate {
  id: string;
  location: string;
  createdAt: string;
}

interface ShipmentData {
  packageCode: string;
  source: string;
  destination: string;
  status: string;
  vehicleNumber: string | null;
  transporterName: string | null;
}

interface TrackingResultProps {
  shipment: ShipmentData;
  trackingUpdates: TrackingUpdate[];
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

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

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)} at ${formatTime(isoString)}`;
}

export function TrackingResult({
  shipment,
  trackingUpdates,
}: TrackingResultProps) {
  const latestUpdate = trackingUpdates.length > 0 ? trackingUpdates[0] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/track"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Track another shipment
      </Link>

      {/* Shipment header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">
            {shipment.packageCode}
          </h1>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      {/* Shipment details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailCard
          label="Source"
          value={shipment.source}
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
        />
        <DetailCard
          label="Destination"
          value={shipment.destination}
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
        />
        <DetailCard
          label="Vehicle"
          value={shipment.vehicleNumber || "Not assigned"}
          icon={<Truck className="h-4 w-4 text-muted-foreground" />}
        />
        {shipment.transporterName && (
          <DetailCard
            label="Transporter"
            value={shipment.transporterName}
            icon={<Truck className="h-4 w-4 text-muted-foreground" />}
          />
        )}
      </div>

      {/* Latest update highlight */}
      {latestUpdate && (
        <div className="rounded-lg border border-foreground/10 bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            Latest Update
          </p>
          <p className="text-sm font-medium">{latestUpdate.location}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDateTime(latestUpdate.createdAt)}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-base font-semibold mb-4">Tracking History</h2>
        {trackingUpdates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-foreground/15 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No tracking updates yet. Updates will appear here as your shipment
              progresses.
            </p>
          </div>
        ) : (
          <div className="relative pl-6" role="list" aria-label="Tracking timeline">
            {/* Vertical line */}
            <div
              className="absolute left-[7px] top-2 bottom-2 w-px bg-foreground/10"
              aria-hidden="true"
            />

            <ol className="flex flex-col gap-4">
              {trackingUpdates.map((update, index) => (
                <li key={update.id} className="relative flex gap-3" role="listitem">
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

function DetailCard({
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
