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

// ─── Route ───────────────────────────────────────────────────────────────────

export const routeFormSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  distanceKm: z.coerce
    .number()
    .positive("Distance must be a positive number"),
  estimatedTime: z.string().min(1, "Estimated time is required"),
  billingRate: z.coerce
    .number()
    .positive("Billing rate must be a positive number"),
  vendorRate: z.coerce
    .number()
    .positive("Vendor rate must be a positive number"),
});

export const routeApiSchema = routeFormSchema;

export const routeUpdateApiSchema = routeApiSchema.partial();

export type RouteFormInput = z.infer<typeof routeFormSchema>;
export type RouteApiInput = z.infer<typeof routeApiSchema>;

// ─── Shipment ────────────────────────────────────────────────────────────────

export const shipmentStatusEnum = z.enum([
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
]);

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const STATUS_BADGE_COLORS: Record<string, string> = {
  CREATED:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  ASSIGNED:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PICKED_UP:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  IN_TRANSIT:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  DELIVERED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CANCELLED:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export const shipmentFormSchema = z
  .object({
    packageCode: z.string().min(1, "Package code is required"),
    source: z.string().min(1, "Source is required"),
    destination: z.string().min(1, "Destination is required"),
    materialType: z.string().min(1, "Material type is required"),
    grossWeightKg: z.coerce
      .number()
      .positive("Gross weight must be a positive number"),
    tareWeightKg: z.coerce
      .number()
      .positive("Tare weight must be a positive number")
      .optional()
      .nullable(),
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number")
      .positive("Quantity must be a positive number"),
    pickupDate: z.date({ error: "Pickup date is required" }),
    deliveryDeadline: z.date({
      error: "Delivery deadline is required",
    }),
    transporterId: z.string().optional(),
    vehicleId: z.string().optional(),
    routeId: z.string().optional(),
  })
  .refine((data) => data.deliveryDeadline >= data.pickupDate, {
    message: "Delivery deadline must be on or after pickup date",
    path: ["deliveryDeadline"],
  });

export const shipmentApiSchema = z
  .object({
    packageCode: z.string().min(1, "Package code is required"),
    source: z.string().min(1, "Source is required"),
    destination: z.string().min(1, "Destination is required"),
    materialType: z.string().min(1, "Material type is required"),
    grossWeightKg: z.coerce
      .number()
      .positive("Gross weight must be a positive number"),
    tareWeightKg: z.coerce
      .number()
      .positive()
      .optional()
      .nullable(),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    pickupDate: z.string().min(1, "Pickup date is required"),
    deliveryDeadline: z.string().min(1, "Delivery deadline is required"),
    transporterId: z.string().optional().nullable(),
    vehicleId: z.string().optional().nullable(),
    routeId: z.string().optional().nullable(),
  })
  .refine((data) => data.deliveryDeadline >= data.pickupDate, {
    message: "Delivery deadline must be on or after pickup date",
    path: ["deliveryDeadline"],
  });

// Define the base object shape for shipment updates (without refinement, so .partial() works)
const shipmentApiBaseShape = {
  packageCode: z.string().min(1, "Package code is required"),
  source: z.string().min(1, "Source is required"),
  destination: z.string().min(1, "Destination is required"),
  materialType: z.string().min(1, "Material type is required"),
  grossWeightKg: z.coerce
    .number()
    .positive("Gross weight must be a positive number"),
  tareWeightKg: z.coerce.number().positive().optional().nullable(),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  pickupDate: z.string().min(1, "Pickup date is required"),
  deliveryDeadline: z.string().min(1, "Delivery deadline is required"),
  transporterId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  routeId: z.string().optional().nullable(),
};

export const shipmentUpdateApiSchema = z.object(shipmentApiBaseShape).partial();

export const shipmentStatusUpdateSchema = z.object({
  status: shipmentStatusEnum,
});

export type ShipmentFormInput = z.infer<typeof shipmentFormSchema>;
export type ShipmentApiInput = z.infer<typeof shipmentApiSchema>;
export type ShipmentStatusUpdateInput = z.infer<
  typeof shipmentStatusUpdateSchema
>;

// ─── Tracking Update ──────────────────────────────────────────────────────────

export const trackingUpdateSchema = z.object({
  shipmentId: z.string().min(1, "Shipment ID is required"),
  location: z.string().min(1, "Location is required"),
  latitude: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .optional()
    .nullable(),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .optional()
    .nullable(),
});

export type TrackingUpdateInput = z.infer<typeof trackingUpdateSchema>;
