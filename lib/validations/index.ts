import { z } from "zod";

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Transporter ─────────────────────────────────────────────────────────────

export const transporterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gstNumber: z.string().optional(),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type TransporterInput = z.infer<typeof transporterSchema>;

// ─── Vehicle ─────────────────────────────────────────────────────────────────

export const vehicleTypeEnum = z.enum(["TRUCK", "DUMPER", "VAN", "OTHER"]);
export const vehicleStatusEnum = z.enum(["AVAILABLE", "BUSY", "MAINTENANCE"]);

const vehicleBaseSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  transporterId: z.string().min(1, "Transporter is required"),
  vehicleType: vehicleTypeEnum,
  capacityKg: z.coerce
    .number()
    .positive("Capacity must be a positive number"),
  currentLocation: z.string().optional(),
  status: vehicleStatusEnum.default("AVAILABLE"),
});

export const vehicleFormSchema = vehicleBaseSchema.extend({
  lastMaintenanceDate: z.date().optional().nullable(),
});

export const vehicleApiSchema = vehicleBaseSchema.extend({
  lastMaintenanceDate: z.string().optional().nullable(),
});

export const vehicleUpdateApiSchema = vehicleApiSchema.partial();

export type VehicleFormInput = z.infer<typeof vehicleFormSchema>;
export type VehicleApiInput = z.infer<typeof vehicleApiSchema>;

// Zod validation schemas will be implemented alongside each feature
// This file will contain schemas for:
// - Route CRUD validation
// - Shipment CRUD validation
// - Tracking update validation
