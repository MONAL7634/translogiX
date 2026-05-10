"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transporterSchema, type TransporterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface EditTransporterPageProps {
  transporterId: string;
}

export function EditTransporterForm({ transporterId }: EditTransporterPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transporterSchema),
    defaultValues: {
      name: "",
      gstNumber: "",
      contactPerson: "",
      phone: "",
      email: "",
      status: "active" as const,
    },
  });

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/transporters/${transporterId}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Transporter not found");
          }
          throw new Error("Failed to fetch transporter");
        }

        const data = await response.json();
        const t = data.transporter;

        if (!cancelled) {
          reset({
            name: t.name || "",
            gstNumber: t.gstNumber || "",
            contactPerson: t.contactPerson || "",
            phone: t.phone || "",
            email: t.email || "",
            status: t.status || "active",
          });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transporterId, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const onSubmit = async (data: TransporterInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/transporters/${transporterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          gstNumber: data.gstNumber || undefined,
          email: data.email || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update transporter");
      }

      toast.success("Transporter updated successfully");
      router.push("/admin/transporters");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update transporter"
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
            {[1, 2, 3, 4, 5].map((i) => (
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
        <p className="text-lg font-medium">Failed to load transporter</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-3">
          <Link href="/admin/transporters">
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
        <Link href="/admin/transporters">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Transporter</h1>
          <p className="text-muted-foreground">
            Update transporter details
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transporter Details</CardTitle>
          <CardDescription>
            Modify the transporter information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Swift Cargo"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* GST Number */}
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number (Optional)</Label>
              <Input
                id="gstNumber"
                placeholder="e.g., 22AAAAA0000A1Z5"
                {...register("gstNumber")}
                aria-invalid={!!errors.gstNumber}
              />
              {errors.gstNumber && (
                <p className="text-sm text-destructive">
                  {errors.gstNumber.message}
                </p>
              )}
            </div>

            {/* Contact Person */}
            <div className="space-y-2">
              <Label htmlFor="contactPerson">
                Contact Person <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactPerson"
                placeholder="e.g., John Doe"
                {...register("contactPerson")}
                aria-invalid={!!errors.contactPerson}
              />
              {errors.contactPerson && (
                <p className="text-sm text-destructive">
                  {errors.contactPerson.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="e.g., +91 98765 43210"
                {...register("phone")}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., contact@swiftcargo.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/admin/transporters">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
