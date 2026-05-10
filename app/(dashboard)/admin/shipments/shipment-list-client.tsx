"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Pencil,
  RefreshCw,
  AlertTriangle,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  STATUS_BADGE_COLORS,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/validations";

interface Shipment {
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
  status:
    | "CREATED"
    | "ASSIGNED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  transporterName: string | null;
  vehicleNumber: string | null;
}

interface ShipmentListClientProps {
  role: "ADMIN" | "TRANSPORTER";
}

export function ShipmentListClient({ role }: ShipmentListClientProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const debouncedSearch = useDebounce(search, 300);

  const basePath =
    role === "ADMIN" ? "/admin/shipments" : "/transporter/shipments";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);

        const response = await fetch(`/api/shipments?${params.toString()}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error("Failed to fetch shipments");
        }

        const data = await response.json();
        if (!cancelled) {
          setShipments(data.shipments);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const handleStatusChange = async (
    shipment: Shipment,
    newStatus: string | null
  ) => {
    if (!newStatus) return;
    setStatusUpdating(shipment.id);

    try {
      const response = await fetch(`/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      const data = await response.json();

      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipment.id
            ? { ...s, status: data.shipment.status as Shipment["status"] }
            : s
        )
      );

      toast.success(
        `Shipment "${shipment.packageCode}" status changed to ${newStatus}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  if (loading) {
    return <ShipmentListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load shipments</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipments</h1>
          <p className="text-muted-foreground">
            {role === "ADMIN"
              ? "Manage all shipments"
              : "Manage your shipments"}
          </p>
        </div>
        <Link href={`${basePath}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Shipment
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by package code, source, or destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package Code</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Gross Wt (kg)</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transporter</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  {search
                    ? "No shipments match your search."
                    : "No shipments found."}
                </TableCell>
              </TableRow>
            ) : (
              shipments.map((shipment) => {
                const validNext =
                  VALID_STATUS_TRANSITIONS[shipment.status] || [];
                const isTerminal = validNext.length === 0;
                const isUpdating = statusUpdating === shipment.id;

                return (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {shipment.packageCode}
                      </div>
                    </TableCell>
                    <TableCell>{shipment.source}</TableCell>
                    <TableCell>{shipment.destination}</TableCell>
                    <TableCell>{shipment.materialType}</TableCell>
                    <TableCell>
                      {Number(shipment.grossWeightKg).toLocaleString()}
                    </TableCell>
                    <TableCell>{shipment.quantity}</TableCell>
                    <TableCell>
                      {isTerminal ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[shipment.status]}`}
                        >
                          {shipment.status.replace("_", " ")}
                        </span>
                      ) : (
                        <Select
                          value={shipment.status}
                          onValueChange={(value) =>
                            handleStatusChange(shipment, value)
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[shipment.status]}`}
                              >
                                {shipment.status.replace("_", " ")}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {/* Current status (non-selectable, shown for context) */}
                            <SelectItem value={shipment.status} disabled>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[shipment.status]}`}
                              >
                                {shipment.status.replace("_", " ")}
                              </span>
                            </SelectItem>
                            {validNext.map((status) => (
                              <SelectItem key={status} value={status}>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[status]}`}
                                >
                                  {status.replace("_", " ")}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>{shipment.transporterName || "—"}</TableCell>
                    <TableCell>{shipment.vehicleNumber || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`${basePath}/${shipment.id}/edit`}>
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ShipmentListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="rounded-md border">
        <div className="space-y-0">
          <div className="flex h-10 items-center gap-4 border-b px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex h-14 items-center gap-4 px-4 border-b last:border-0"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                <Skeleton key={col} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
