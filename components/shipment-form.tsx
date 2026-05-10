"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  shipmentFormSchema,
  type ShipmentFormInput,
} from "@/lib/validations";
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
  Star,
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

interface Vehicle {
  id: string;
  vehicleNumber: string;
  transporterId: string;
  transporterName: string;
  capacityKg: number;
  status: string;
}

interface Route {
  id: string;
  origin: string;
  destination: string;
  distanceKm: string;
  estimatedTime: string;
  billingRate: string;
  vendorRate: string;
}

interface ShipmentFormProps {
  role: "ADMIN" | "TRANSPORTER";
  transporterId?: string;
  initialData?: {
    packageCode: string;
    source: string;
    destination: string;
    materialType: string;
    grossWeightKg: number;
    tareWeightKg: number | null;
    quantity: number;
    pickupDate: string;
    deliveryDeadline: string;
    transporterId: string | null;
    vehicleId: string | null;
    routeId: string | null;
  };
  shipmentId?: string;
}

export function ShipmentForm({
  role,
  transporterId: fixedTransporterId,
  initialData,
  shipmentId,
}: ShipmentFormProps) {
  const router = useRouter();
  const basePath =
    role === "ADMIN" ? "/admin/shipments" : "/transporter/shipments";
  const isEditing = !!shipmentId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!initialData && !!shipmentId);
  const [error, setError] = useState<string | null>(null);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loadingTransporters, setLoadingTransporters] = useState(
    role === "ADMIN" && !fixedTransporterId
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deadlineCalendarOpen, setDeadlineCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: initialData
      ? {
          packageCode: initialData.packageCode,
          source: initialData.source,
          destination: initialData.destination,
          materialType: initialData.materialType,
          grossWeightKg: initialData.grossWeightKg,
          tareWeightKg: initialData.tareWeightKg,
          quantity: initialData.quantity,
          pickupDate: new Date(initialData.pickupDate),
          deliveryDeadline: new Date(initialData.deliveryDeadline),
          transporterId: initialData.transporterId || "",
          vehicleId: initialData.vehicleId || "",
          routeId: initialData.routeId || "",
        }
      : {
          packageCode: "",
          source: "",
          destination: "",
          materialType: "",
          grossWeightKg: undefined as unknown as number,
          tareWeightKg: null as number | null,
          quantity: undefined as unknown as number,
          pickupDate: undefined as unknown as Date,
          deliveryDeadline: undefined as unknown as Date,
          transporterId: fixedTransporterId || "",
          vehicleId: "",
          routeId: "",
        },
  });

  const selectedTransporterId = watch("transporterId") ?? "";
  const selectedVehicleId = watch("vehicleId") ?? "";
  const selectedRouteId = watch("routeId") ?? "";
  const grossWeightKgRaw = watch("grossWeightKg");
  const grossWeightKg = Number(grossWeightKgRaw) || 0;
  const pickupDate = watch("pickupDate");
  const deliveryDeadline = watch("deliveryDeadline");
  const source = watch("source");
  const destination = watch("destination");

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
          const active = data.transporters.filter(
            (t: Transporter) => t.status === "active"
          );
          setTransporters(active);
        }
      } catch {
        // Will show empty dropdown
      } finally {
        if (!cancelled) setLoadingTransporters(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, fixedTransporterId]);

  // Fetch available vehicles when grossWeightKg changes
  const fetchVehicles = useCallback(async () => {
    try {
      setLoadingVehicles(true);
      const params = new URLSearchParams();
      params.set("available", "true");
      const response = await fetch(`/api/vehicles?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      const data = await response.json();

      // Filter to only AVAILABLE vehicles (the API may return all)
      const available = data.vehicles.filter(
        (v: Vehicle) => v.status === "AVAILABLE"
      );

      // If transporter is selected, filter by transporter
      const filtered =
        selectedTransporterId && selectedTransporterId !== "any"
          ? available.filter(
              (v: Vehicle) => v.transporterId === selectedTransporterId
            )
          : available;

      // Sort by capacity: recommend the smallest sufficient capacity first
      const weight = grossWeightKg || 0;
      const sorted = filtered.sort((a: Vehicle, b: Vehicle) => {
        const aSufficient = a.capacityKg >= weight;
        const bSufficient = b.capacityKg >= weight;
        if (aSufficient && !bSufficient) return -1;
        if (!aSufficient && bSufficient) return 1;
        if (aSufficient && bSufficient)
          return a.capacityKg - b.capacityKg; // smallest sufficient first
        return a.capacityKg - b.capacityKg; // smallest first for insufficient
      });

      setVehicles(sorted);
    } catch {
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, [selectedTransporterId, grossWeightKg]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Fetch routes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingRoutes(true);
        const response = await fetch("/api/routes", { credentials: "include" });
        if (cancelled) return;
        if (!response.ok) throw new Error("Failed to fetch routes");
        const data = await response.json();
        if (!cancelled) {
          setAllRoutes(data.routes);
        }
      } catch {
        setAllRoutes([]);
      } finally {
        if (!cancelled) setLoadingRoutes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Compute recommended vehicle (smallest AVAILABLE with capacity >= grossWeightKg)
  const recommendedVehicleId = (() => {
    const weight = grossWeightKg || 0;
    if (weight <= 0) return null;
    const suitable = vehicles
      .filter((v) => v.capacityKg >= weight)
      .sort((a, b) => a.capacityKg - b.capacityKg);
    return suitable.length > 0 ? suitable[0].id : null;
  })();

  // Compute suggested route (matching origin/destination, lowest distance first)
  const suggestedRouteId = (() => {
    if (!source || !destination) return null;
    const matching = allRoutes
      .filter(
        (r) =>
          r.origin.toLowerCase() === source.toLowerCase() &&
          r.destination.toLowerCase() === destination.toLowerCase()
      )
      .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm));
    return matching.length > 0 ? matching[0].id : null;
  })();

  // Auto-select recommended vehicle if none selected
  useEffect(() => {
    if (!isEditing && recommendedVehicleId && !selectedVehicleId) {
      setValue("vehicleId", recommendedVehicleId, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendedVehicleId, isEditing]);

  // Auto-select suggested route if none selected
  useEffect(() => {
    if (!isEditing && suggestedRouteId && !selectedRouteId) {
      setValue("routeId", suggestedRouteId, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedRouteId, isEditing]);

  // Ensure current vehicle is in dropdown when editing
  useEffect(() => {
    if (!isEditing || !initialData?.vehicleId) return;
    const exists = vehicles.some((v) => v.id === initialData.vehicleId);
    if (!exists) {
      fetch(`/api/vehicles/${initialData.vehicleId}`, {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.vehicle) {
            setVehicles((prev) => [data.vehicle, ...prev]);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialData?.vehicleId, vehicles.length]);

  // Fetch existing shipment data for editing
  useEffect(() => {
    if (!shipmentId || initialData) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/shipments/${shipmentId}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Shipment not found");
          }
          throw new Error("Failed to fetch shipment");
        }

        const data = await response.json();
        const s = data.shipment;

        if (!cancelled) {
          reset({
            packageCode: s.packageCode || "",
            source: s.source || "",
            destination: s.destination || "",
            materialType: s.materialType || "",
            grossWeightKg: Number(s.grossWeightKg),
            tareWeightKg: s.tareWeightKg ? Number(s.tareWeightKg) : null,
            quantity: s.quantity,
            pickupDate: new Date(s.pickupDate),
            deliveryDeadline: new Date(s.deliveryDeadline),
            transporterId: s.transporterId || "",
            vehicleId: s.vehicleId || "",
            routeId: s.routeId || "",
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

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const onSubmit = async (data: ShipmentFormInput) => {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/shipments/${shipmentId}` : "/api/shipments";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        packageCode: data.packageCode,
        source: data.source,
        destination: data.destination,
        materialType: data.materialType,
        grossWeightKg: data.grossWeightKg,
        tareWeightKg: data.tareWeightKg || undefined,
        quantity: data.quantity,
        pickupDate: data.pickupDate.toISOString().split("T")[0],
        deliveryDeadline: data.deliveryDeadline.toISOString().split("T")[0],
        transporterId:
          data.transporterId && data.transporterId !== "any"
            ? data.transporterId
            : null,
        vehicleId:
          data.vehicleId && data.vehicleId !== "any"
            ? data.vehicleId
            : null,
        routeId:
          data.routeId && data.routeId !== "any" ? data.routeId : null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save shipment");
      }

      toast.success(
        isEditing
          ? "Shipment updated successfully"
          : "Shipment created successfully"
      );

      router.push(basePath);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save shipment"
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
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
        <p className="text-lg font-medium">Failed to load shipment</p>
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
            {isEditing ? "Edit Shipment" : "Add New Shipment"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update shipment details"
              : "Create a new shipment"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
          <CardDescription>
            Fill in the shipment information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Package Code */}
            <div className="space-y-2">
              <Label htmlFor="packageCode">
                Package Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="packageCode"
                placeholder="e.g., PKG-006"
                {...register("packageCode")}
                aria-invalid={!!errors.packageCode}
              />
              {errors.packageCode && (
                <p className="text-sm text-destructive">
                  {errors.packageCode.message}
                </p>
              )}
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">
                Source <span className="text-destructive">*</span>
              </Label>
              <Input
                id="source"
                placeholder="e.g., Mumbai"
                {...register("source")}
                aria-invalid={!!errors.source}
              />
              {errors.source && (
                <p className="text-sm text-destructive">
                  {errors.source.message}
                </p>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label htmlFor="destination">
                Destination <span className="text-destructive">*</span>
              </Label>
              <Input
                id="destination"
                placeholder="e.g., Delhi"
                {...register("destination")}
                aria-invalid={!!errors.destination}
              />
              {errors.destination && (
                <p className="text-sm text-destructive">
                  {errors.destination.message}
                </p>
              )}
            </div>

            {/* Material Type */}
            <div className="space-y-2">
              <Label htmlFor="materialType">
                Material Type <span className="text-destructive">*</span>
              </Label>
              <Input
                id="materialType"
                placeholder="e.g., Electronics"
                {...register("materialType")}
                aria-invalid={!!errors.materialType}
              />
              {errors.materialType && (
                <p className="text-sm text-destructive">
                  {errors.materialType.message}
                </p>
              )}
            </div>

            {/* Gross Weight */}
            <div className="space-y-2">
              <Label htmlFor="grossWeightKg">
                Gross Weight (kg) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="grossWeightKg"
                type="number"
                placeholder="e.g., 15000"
                {...register("grossWeightKg")}
                aria-invalid={!!errors.grossWeightKg}
              />
              {errors.grossWeightKg && (
                <p className="text-sm text-destructive">
                  {errors.grossWeightKg.message}
                </p>
              )}
            </div>

            {/* Tare Weight */}
            <div className="space-y-2">
              <Label htmlFor="tareWeightKg">
                Tare Weight (kg) <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="tareWeightKg"
                type="number"
                placeholder="e.g., 5000"
                {...register("tareWeightKg")}
                aria-invalid={!!errors.tareWeightKg}
              />
              {errors.tareWeightKg && (
                <p className="text-sm text-destructive">
                  {errors.tareWeightKg.message}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                placeholder="e.g., 100"
                {...register("quantity")}
                aria-invalid={!!errors.quantity}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Pickup Date */}
            <div className="space-y-2">
              <Label>
                Pickup Date <span className="text-destructive">*</span>
              </Label>
              <Popover
                open={pickupCalendarOpen}
                onOpenChange={setPickupCalendarOpen}
              >
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        !pickupDate && "text-muted-foreground"
                      )}
                    >
                      {pickupDate
                        ? format(pickupDate, "PPP")
                        : "Select pickup date"}
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pickupDate ?? undefined}
                    onSelect={(date) => {
                      setValue("pickupDate", date as Date, {
                        shouldValidate: true,
                      });
                      setPickupCalendarOpen(false);
                    }}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("pickupDate")} />
              {errors.pickupDate && (
                <p className="text-sm text-destructive">
                  {errors.pickupDate.message}
                </p>
              )}
            </div>

            {/* Delivery Deadline */}
            <div className="space-y-2">
              <Label>
                Delivery Deadline <span className="text-destructive">*</span>
              </Label>
              <Popover
                open={deadlineCalendarOpen}
                onOpenChange={setDeadlineCalendarOpen}
              >
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        !deliveryDeadline && "text-muted-foreground"
                      )}
                    >
                      {deliveryDeadline
                        ? format(deliveryDeadline, "PPP")
                        : "Select delivery deadline"}
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deliveryDeadline ?? undefined}
                    onSelect={(date) => {
                      setValue("deliveryDeadline", date as Date, {
                        shouldValidate: true,
                      });
                      setDeadlineCalendarOpen(false);
                    }}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" {...register("deliveryDeadline")} />
              {errors.deliveryDeadline && (
                <p className="text-sm text-destructive">
                  {errors.deliveryDeadline.message}
                </p>
              )}
            </div>

            {/* Transporter (Admin only) */}
            {role === "ADMIN" && !fixedTransporterId ? (
              <div className="space-y-2">
                <Label htmlFor="transporterId">
                  Transporter{" "}
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                {loadingTransporters ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    value={selectedTransporterId || undefined}
                    onValueChange={(value) =>
                      setValue("transporterId", value === "any" ? "" : (value ?? ""), {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a transporter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">None</SelectItem>
                      {transporters.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <input type="hidden" {...register("transporterId")} />
            )}

            {/* Vehicle */}
            <div className="space-y-2">
              <Label htmlFor="vehicleId">
                Vehicle{" "}
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              {loadingVehicles ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={selectedVehicleId || undefined}
                  onValueChange={(value) =>
                    setValue("vehicleId", value === "any" ? "" : (value ?? ""), { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">None</SelectItem>
                    {vehicles.map((v) => {
                      const isRecommended = v.id === recommendedVehicleId;
                      const hasCapacity =
                        (grossWeightKg || 0) > 0 &&
                        v.capacityKg >= grossWeightKg;
                      return (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            {isRecommended && (
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            )}
                            <span>
                              {v.vehicleNumber} ({v.capacityKg.toLocaleString()}{" "}
                              kg)
                            </span>
                            {isRecommended && (
                              <span className="text-xs text-yellow-600 font-medium">
                                Recommended
                              </span>
                            )}
                            {!hasCapacity && (grossWeightKg || 0) > 0 && (
                              <span className="text-xs text-destructive">
                                Insufficient capacity
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                    {vehicles.length === 0 && (
                      <SelectItem value="none" disabled>
                        No available vehicles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Only AVAILABLE vehicles are shown.{" "}
                {recommendedVehicleId
                  ? "The star indicates the recommended vehicle."
                  : "No suitable vehicle found for the given weight."}
              </p>
            </div>

            {/* Route */}
            <div className="space-y-2">
              <Label htmlFor="routeId">
                Route{" "}
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              {loadingRoutes ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={selectedRouteId || undefined}
                  onValueChange={(value) =>
                    setValue("routeId", value === "any" ? "" : (value ?? ""), { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">None</SelectItem>
                    {allRoutes.map((r) => {
                      const isSuggested = r.id === suggestedRouteId;
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          <div className="flex items-center gap-2">
                            {isSuggested && (
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            )}
                            <span>
                              {r.origin} → {r.destination} ({r.distanceKm} km)
                            </span>
                            {isSuggested && (
                              <span className="text-xs text-yellow-600 font-medium">
                                Suggested
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                {suggestedRouteId
                  ? "Route matching your source/destination is suggested."
                  : source && destination
                    ? "No exact route match found. Select manually."
                    : "Enter source and destination for route suggestions."}
              </p>
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
                {isEditing ? "Save Changes" : "Create Shipment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
