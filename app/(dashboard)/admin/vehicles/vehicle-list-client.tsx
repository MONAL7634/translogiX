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
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface Vehicle {
  id: string;
  vehicleNumber: string;
  transporterId: string;
  transporterName: string;
  vehicleType: "TRUCK" | "DUMPER" | "VAN" | "OTHER";
  capacityKg: number;
  currentLocation: string | null;
  status: "AVAILABLE" | "BUSY" | "MAINTENANCE";
  lastMaintenanceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VehicleListClientProps {
  role: "ADMIN" | "TRANSPORTER";
}

const vehicleTypeBadgeColors: Record<string, string> = {
  TRUCK: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DUMPER: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  VAN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const statusBadgeColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  BUSY: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  MAINTENANCE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function VehicleListClient({ role }: VehicleListClientProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusToggling, setStatusToggling] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const debouncedSearch = useDebounce(search, 300);

  const basePath = role === "ADMIN" ? "/admin/vehicles" : "/transporter/vehicles";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);

        const response = await fetch(`/api/vehicles?${params.toString()}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error("Failed to fetch vehicles");
        }

        const data = await response.json();
        if (!cancelled) {
          setVehicles(data.vehicles);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedSearch, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const handleStatusChange = async (vehicle: Vehicle, newStatus: string | null) => {
    if (!newStatus) return;
    setStatusToggling(vehicle.id);

    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update vehicle status");
      }

      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicle.id ? { ...v, status: newStatus as Vehicle["status"] } : v
        )
      );

      toast.success(
        `Vehicle "${vehicle.vehicleNumber}" status changed to ${newStatus}`
      );
    } catch {
      toast.error("Failed to update vehicle status");
    } finally {
      setStatusToggling(null);
    }
  };

  if (loading) {
    return <VehicleListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load vehicles</p>
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
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground">
            {role === "ADMIN" ? "Manage all vehicles" : "Manage your vehicles"}
          </p>
        </div>
        <Link href={`${basePath}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by vehicle number, transporter, or type..."
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
              <TableHead>Vehicle Number</TableHead>
              {role === "ADMIN" && <TableHead>Transporter</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Capacity (kg)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={role === "ADMIN" ? 7 : 6} className="h-24 text-center">
                  {search
                    ? "No vehicles match your search."
                    : "No vehicles found."}
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      {vehicle.vehicleNumber}
                    </div>
                  </TableCell>
                  {role === "ADMIN" && (
                    <TableCell>{vehicle.transporterName}</TableCell>
                  )}
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${vehicleTypeBadgeColors[vehicle.vehicleType]}`}
                    >
                      {vehicle.vehicleType}
                    </span>
                  </TableCell>
                  <TableCell>{vehicle.capacityKg.toLocaleString()}</TableCell>
                  <TableCell>
                    <Select
                      value={vehicle.status}
                      onValueChange={(value) => handleStatusChange(vehicle, value)}
                      disabled={statusToggling === vehicle.id}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColors[vehicle.status]}`}
                          >
                            {vehicle.status}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColors.AVAILABLE}`}>
                            AVAILABLE
                          </span>
                        </SelectItem>
                        <SelectItem value="BUSY">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColors.BUSY}`}>
                            BUSY
                          </span>
                        </SelectItem>
                        <SelectItem value="MAINTENANCE">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColors.MAINTENANCE}`}>
                            MAINTENANCE
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{vehicle.currentLocation || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`${basePath}/${vehicle.id}/edit`}>
                      <Button variant="ghost" size="icon-sm">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function VehicleListSkeleton() {
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
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex h-14 items-center gap-4 px-4 border-b last:border-0">
              {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                <Skeleton key={col} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
