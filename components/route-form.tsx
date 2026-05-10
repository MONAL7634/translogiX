"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { routeFormSchema, type RouteFormInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface RouteFormProps {
  initialData?: {
    origin: string;
    destination: string;
    distanceKm: number;
    estimatedTime: string;
    billingRate: number;
    vendorRate: number;
  };
  routeId?: string;
}

export function RouteForm({ initialData, routeId }: RouteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!initialData && !!routeId);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const isEditing = !!routeId;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(routeFormSchema),
    defaultValues: initialData
      ? {
          origin: initialData.origin,
          destination: initialData.destination,
          distanceKm: initialData.distanceKm,
          estimatedTime: initialData.estimatedTime,
          billingRate: initialData.billingRate,
          vendorRate: initialData.vendorRate,
        }
      : {
          origin: "",
          destination: "",
          distanceKm: undefined as unknown as number,
          estimatedTime: "",
          billingRate: undefined as unknown as number,
          vendorRate: undefined as unknown as number,
        },
  });

  // Fetch existing route data for editing
  useEffect(() => {
    if (!routeId || initialData) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/routes/${routeId}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Route not found");
          }
          throw new Error("Failed to fetch route");
        }

        const data = await response.json();
        const r = data.route;

        if (!cancelled) {
          reset({
            origin: r.origin || "",
            destination: r.destination || "",
            distanceKm: Number(r.distanceKm),
            estimatedTime: r.estimatedTime || "",
            billingRate: Number(r.billingRate),
            vendorRate: Number(r.vendorRate),
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
  }, [routeId, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const onSubmit = async (data: RouteFormInput) => {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/routes/${routeId}` : "/api/routes";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save route");
      }

      toast.success(
        isEditing ? "Route updated successfully" : "Route created successfully"
      );

      router.push("/admin/routes");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save route");
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        <p className="text-lg font-medium">Failed to load route</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-3">
          <Link href="/admin/routes">
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
        <Link href="/admin/routes">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Route" : "Add New Route"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update route details"
              : "Create a new transport route"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Route Details</CardTitle>
          <CardDescription>
            Fill in the route information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Origin */}
            <div className="space-y-2">
              <Label htmlFor="origin">
                Origin <span className="text-destructive">*</span>
              </Label>
              <Input
                id="origin"
                placeholder="e.g., Mumbai"
                {...register("origin")}
                aria-invalid={!!errors.origin}
              />
              {errors.origin && (
                <p className="text-sm text-destructive">
                  {errors.origin.message}
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

            {/* Distance */}
            <div className="space-y-2">
              <Label htmlFor="distanceKm">
                Distance (km) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="distanceKm"
                type="number"
                step="any"
                placeholder="e.g., 1400"
                {...register("distanceKm")}
                aria-invalid={!!errors.distanceKm}
              />
              {errors.distanceKm && (
                <p className="text-sm text-destructive">
                  {errors.distanceKm.message}
                </p>
              )}
            </div>

            {/* Estimated Time */}
            <div className="space-y-2">
              <Label htmlFor="estimatedTime">
                Estimated Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="estimatedTime"
                placeholder="e.g., 24h"
                {...register("estimatedTime")}
                aria-invalid={!!errors.estimatedTime}
              />
              {errors.estimatedTime && (
                <p className="text-sm text-destructive">
                  {errors.estimatedTime.message}
                </p>
              )}
            </div>

            {/* Billing Rate */}
            <div className="space-y-2">
              <Label htmlFor="billingRate">
                Billing Rate (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="billingRate"
                type="number"
                step="any"
                placeholder="e.g., 45000"
                {...register("billingRate")}
                aria-invalid={!!errors.billingRate}
              />
              {errors.billingRate && (
                <p className="text-sm text-destructive">
                  {errors.billingRate.message}
                </p>
              )}
            </div>

            {/* Vendor Rate */}
            <div className="space-y-2">
              <Label htmlFor="vendorRate">
                Vendor Rate (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendorRate"
                type="number"
                step="any"
                placeholder="e.g., 32000"
                {...register("vendorRate")}
                aria-invalid={!!errors.vendorRate}
              />
              {errors.vendorRate && (
                <p className="text-sm text-destructive">
                  {errors.vendorRate.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/admin/routes">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Route"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
