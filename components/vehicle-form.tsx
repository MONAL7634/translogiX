"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleFormSchema, type VehicleFormInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Transporter {
  id: string;
  name: string;
  status: string;
}

interface VehicleFormProps {
  role: "ADMIN" | "TRANSPORTER";
  transporterId?: string;
  initialData?: {
    vehicleNumber: string;
    transporterId: string;
    vehicleType: "TRUCK" | "DUMPER" | "VAN" | "OTHER";
    capacityKg: number;
    currentLocation: string;
    status: "AVAILABLE" | "BUSY" | "MAINTENANCE";
    lastMaintenanceDate: string | null;
  };
  vehicleId?: string;
}

export function VehicleForm({
  role,
  transporterId: fixedTransporterId,
  initialData,
  vehicleId,
}: VehicleFormProps) {
  const router = useRouter();
  const basePath = role === "ADMIN" ? "/admin/vehicles" : "/transporter/vehicles";
  const isEditing = !!vehicleId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!initialData && !!vehicleId);
  const [error, setError] = useState<string | null>(null);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loadingTransporters, setLoadingTransporters] = useState(
    role === "ADMIN" && !fixedTransporterId
  );
  const [retryKey, setRetryKey] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: initialData
      ? {
          vehicleNumber: initialData.vehicleNumber,
          transporterId: initialData.transporterId,
          vehicleType: initialData.vehicleType,
          capacityKg: initialData.capacityKg,
          currentLocation: initialData.currentLocation || "",
          status: initialData.status,
          lastMaintenanceDate: initialData.lastMaintenanceDate
            ? new Date(initialData.lastMaintenanceDate)
            : null,
        }
      : {
          vehicleNumber: "",
          transporterId: fixedTransporterId || "",
          vehicleType: "TRUCK" as const,
          capacityKg: undefined as unknown as number,
          currentLocation: "",
          status: "AVAILABLE" as const,
          lastMaintenanceDate: null,
        },
  });

  const selectedTransporterId = watch("transporterId");
  const selectedVehicleType = watch("vehicleType");
  const selectedStatus = watch("status");
  const lastMaintenanceDate = watch("lastMaintenanceDate");

  // Fetch transporters for admin dropdown
  useEffect(() => {
    if (role !== "ADMIN" || fixedTransporterId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingTransporters(true);
        const response = await fetch("/api/transporters", {
          credentials: "include",
        });
        if (cancelled) return;
        if (!response.ok) throw new Error("Failed to fetch transporters");
        const data = await response.json();
        if (!cancelled) {
          const activeTransporters = data.transporters.filter((t: Transporter) => t.status === "active");
          setTransporters(activeTransporters);
        }
      } catch {
        // Will show empty dropdown
      } finally {
        if (!cancelled) setLoadingTransporters(false);
      }
    })();

    return () => { cancelled = true; };
  }, [role, fixedTransporterId]);

  // Ensure current vehicle's transporter is in dropdown when editing
  useEffect(() => {
    if (!isEditing || !initialData?.transporterId || transporters.length === 0) return;
    const exists = transporters.some(t => t.id === initialData.transporterId);
    if (!exists) {
      fetch(`/api/transporters/${initialData.transporterId}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.transporter) {
            setTransporters(prev => [...prev, data.transporter]);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialData?.transporterId, transporters.length]);

  // Fetch existing vehicle data for editing
  useEffect(() => {
    if (!vehicleId || initialData) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/vehicles/${vehicleId}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Vehicle not found");
          }
          throw new Error("Failed to fetch vehicle");
        }

        const data = await response.json();
        const v = data.vehicle;

        if (!cancelled) {
          reset({
            vehicleNumber: v.vehicleNumber || "",
            transporterId: v.transporterId || "",
            vehicleType: v.vehicleType || "TRUCK",
            capacityKg: v.capacityKg,
            currentLocation: v.currentLocation || "",
            status: v.status || "AVAILABLE",
            lastMaintenanceDate: v.lastMaintenanceDate
              ? new Date(v.lastMaintenanceDate)
              : null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const onSubmit = async (data: VehicleFormInput) => {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/vehicles/${vehicleId}` : "/api/vehicles";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        vehicleNumber: data.vehicleNumber,
        transporterId: data.transporterId,
        vehicleType: data.vehicleType,
        capacityKg: data.capacityKg,
        currentLocation: data.currentLocation || undefined,
        status: data.status,
        lastMaintenanceDate: data.lastMaintenanceDate
          ? data.lastMaintenanceDate.toISOString().split("T")[0]
          : null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save vehicle");
      }

      toast.success(
        isEditing
          ? "Vehicle updated successfully"
          : "Vehicle created successfully"
      );

      router.push(basePath);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save vehicle"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load vehicle</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-3">
          <Link href={basePath}>
            <Button variant="outline">Back to List</Button>
          </Link>
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={basePath}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Vehicle" : "Add New Vehicle"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update vehicle details"
              : "Register a new vehicle"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
          <CardDescription>
            Fill in the vehicle information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Vehicle Number */}
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">
                Vehicle Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vehicleNumber"
                placeholder="e.g., MH-01-AB-1234"
                {...register("vehicleNumber")}
                aria-invalid={!!errors.vehicleNumber}
              />
              {errors.vehicleNumber && (
                <p className="text-sm text-destructive">
                  {errors.vehicleNumber.message}
                </p>
              )}
            </div>

            {/* Transporter */}
            {role === "ADMIN" && !fixedTransporterId ? (
              <div className="space-y-2">
                <Label htmlFor="transporterId">
                  Transporter <span className="text-destructive">*</span>
                </Label>
                {loadingTransporters ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    value={selectedTransporterId || undefined}
                    onValueChange={(value) => { if (value) setValue("transporterId", value, { shouldValidate: true }); }}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!errors.transporterId}
                    >
                      <SelectValue placeholder="Select a transporter" />
                    </SelectTrigger>
                    <SelectContent>
                      {transporters.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.transporterId && (
                  <p className="text-sm text-destructive">
                    {errors.transporterId.message}
                  </p>
                )}
              </div>
            ) : (
              <input type="hidden" {...register("transporterId")} />
            )}

            {/* Vehicle Type */}
            <div className="space-y-2">
              <Label htmlFor="vehicleType">
                Vehicle Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedVehicleType}
                onValueChange={(value) => setValue("vehicleType", value as "TRUCK" | "DUMPER" | "VAN" | "OTHER", { shouldValidate: true })}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.vehicleType}>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRUCK">TRUCK</SelectItem>
                  <SelectItem value="DUMPER">DUMPER</SelectItem>
                  <SelectItem value="VAN">VAN</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>
              {errors.vehicleType && (
                <p className="text-sm text-destructive">
                  {errors.vehicleType.message}
                </p>
              )}
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <Label htmlFor="capacityKg">
                Capacity (kg) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="capacityKg"
                type="number"
                placeholder="e.g., 18000"
                {...register("capacityKg")}
                aria-invalid={!!errors.capacityKg}
              />
              {errors.capacityKg && (
                <p className="text-sm text-destructive">
                  {errors.capacityKg.message}
                </p>
              )}
            </div>

            {/* Current Location */}
            <div className="space-y-2">
              <Label htmlFor="currentLocation">Current Location (Optional)</Label>
              <Input
                id="currentLocation"
                placeholder="e.g., Mumbai"
                {...register("currentLocation")}
                aria-invalid={!!errors.currentLocation}
              />
              {errors.currentLocation && (
                <p className="text-sm text-destructive">
                  {errors.currentLocation.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue("status", value as "AVAILABLE" | "BUSY" | "MAINTENANCE", { shouldValidate: true })}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.status}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                  <SelectItem value="BUSY">BUSY</SelectItem>
                  <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">
                  {errors.status.message}
                </p>
              )}
            </div>

            {/* Last Maintenance Date */}
            <div className="space-y-2">
              <Label>Last Maintenance Date (Optional)</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        !lastMaintenanceDate && "text-muted-foreground"
                      )}
                    >
                      {lastMaintenanceDate
                        ? format(lastMaintenanceDate, "PPP")
                        : "Pick a date"}
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={lastMaintenanceDate ?? undefined}
                    onSelect={(date) => {
                      setValue("lastMaintenanceDate", date ?? null, { shouldValidate: true });
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date > new Date()}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
              <input
                type="hidden"
                {...register("lastMaintenanceDate")}
              />
              {errors.lastMaintenanceDate && (
                <p className="text-sm text-destructive">
                  {errors.lastMaintenanceDate.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href={basePath}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Vehicle"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
