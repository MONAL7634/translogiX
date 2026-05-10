"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transporterSchema, type TransporterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface TransporterFormProps {
  initialData?: TransporterInput;
  transporterId?: string;
}

export function TransporterForm({ initialData, transporterId }: TransporterFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!transporterId;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transporterSchema),
    defaultValues: initialData || {
      name: "",
      gstNumber: "",
      contactPerson: "",
      phone: "",
      email: "",
      status: "active" as const,
    },
  });

  const onSubmit = async (data: TransporterInput) => {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/transporters/${transporterId}`
        : "/api/transporters";

      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
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
        throw new Error(errorData.error || "Failed to save transporter");
      }

      toast.success(
        isEditing
          ? "Transporter updated successfully"
          : "Transporter created successfully"
      );

      router.push("/admin/transporters");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save transporter"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Transporter" : "Add New Transporter"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update transporter details"
              : "Add a new transport company"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transporter Details</CardTitle>
          <CardDescription>
            Fill in the transporter information below
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
                {isEditing ? "Save Changes" : "Create Transporter"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
