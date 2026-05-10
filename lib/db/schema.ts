import { pgTable, uuid, text, integer, decimal, timestamp, date, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "TRANSPORTER", "DRIVER", "CUSTOMER"]);
export const transporterStatusEnum = pgEnum("transporter_status", ["active", "inactive"]);
export const vehicleTypeEnum = pgEnum("vehicle_type", ["TRUCK", "DUMPER", "VAN", "OTHER"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["AVAILABLE", "BUSY", "MAINTENANCE"]);
export const shipmentStatusEnum = pgEnum("shipment_status", ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name").notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("CUSTOMER").notNull(),
  transporterId: uuid("transporter_id").references(() => transporters.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── BetterAuth Sessions ─────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── BetterAuth Accounts ─────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── BetterAuth Verifications ────────────────────────────────────────────────

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Transporters ────────────────────────────────────────────────────────────

export const transporters = pgTable("transporters", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  gstNumber: text("gst_number"),
  contactPerson: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  status: transporterStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Vehicles ────────────────────────────────────────────────────────────────

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  transporterId: uuid("transporter_id").notNull().references(() => transporters.id),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
  capacityKg: integer("capacity_kg").notNull(),
  currentLocation: text("current_location"),
  status: vehicleStatusEnum("status").default("AVAILABLE").notNull(),
  lastMaintenanceDate: date("last_maintenance_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

export const routes = pgTable("routes", {
  id: uuid("id").defaultRandom().primaryKey(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distanceKm: decimal("distance_km").notNull(),
  estimatedTime: text("estimated_time").notNull(),
  billingRate: decimal("billing_rate").notNull(),
  vendorRate: decimal("vendor_rate").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Shipments ───────────────────────────────────────────────────────────────

export const shipments = pgTable("shipments", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageCode: text("package_code").notNull().unique(),
  source: text("source").notNull(),
  destination: text("destination").notNull(),
  materialType: text("material_type").notNull(),
  grossWeightKg: decimal("gross_weight_kg").notNull(),
  tareWeightKg: decimal("tare_weight_kg"),
  quantity: integer("quantity").notNull(),
  pickupDate: date("pickup_date").notNull(),
  deliveryDeadline: date("delivery_deadline").notNull(),
  transporterId: uuid("transporter_id").references(() => transporters.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  routeId: uuid("route_id").references(() => routes.id),
  status: shipmentStatusEnum("status").default("CREATED").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Tracking Updates ────────────────────────────────────────────────────────

export const trackingUpdates = pgTable("tracking_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id),
  location: text("location").notNull(),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  transporter: one(transporters, {
    fields: [users.transporterId],
    references: [transporters.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const transportersRelations = relations(transporters, ({ many }) => ({
  vehicles: many(vehicles),
  shipments: many(shipments),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  transporter: one(transporters, {
    fields: [vehicles.transporterId],
    references: [transporters.id],
  }),
  shipments: many(shipments),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  shipments: many(shipments),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  transporter: one(transporters, {
    fields: [shipments.transporterId],
    references: [transporters.id],
  }),
  vehicle: one(vehicles, {
    fields: [shipments.vehicleId],
    references: [vehicles.id],
  }),
  route: one(routes, {
    fields: [shipments.routeId],
    references: [routes.id],
  }),
  trackingUpdates: many(trackingUpdates),
}));

export const trackingUpdatesRelations = relations(trackingUpdates, ({ one }) => ({
  shipment: one(shipments, {
    fields: [trackingUpdates.shipmentId],
    references: [shipments.id],
  }),
}));
