import { db } from "../lib/db";
import {
  users,
  sessions,
  accounts,
  verifications,
  transporters,
  vehicles,
  routes,
  shipments,
  trackingUpdates,
} from "../lib/db/schema";
import { hashPassword } from "better-auth/crypto";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// ─── Main Seed ───────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // 1. Clear existing data in reverse dependency order
  console.log("🗑️  Clearing existing data...");
  await db.delete(trackingUpdates);
  await db.delete(shipments);
  await db.delete(routes);
  await db.delete(vehicles);
  await db.delete(verifications);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(users);
  await db.delete(transporters);
  console.log("   ✅ All tables cleared\n");

  // 2. Hash password once — used for all users
  const passwordHash = await hashPassword("password123");

  // 3. Seed Transporters (before users, since transporter user references transporter)
  console.log("🚛 Seeding transporters...");
  const swiftCargoId = crypto.randomUUID();
  const fastRouteId = crypto.randomUUID();

  await db.insert(transporters).values([
    {
      id: swiftCargoId,
      name: "Swift Cargo",
      contactPerson: "Rajesh Kumar",
      phone: "+91-9876543210",
      email: "contact@swiftcargo.com",
      gstNumber: "27AABCU9603R1ZM",
      status: "active",
    },
    {
      id: fastRouteId,
      name: "FastRoute Logistics",
      contactPerson: "Priya Sharma",
      phone: "+91-9123456780",
      email: "info@fastroute.in",
      gstNumber: "29AADCF1234G1Z5",
      status: "active",
    },
  ]);

  console.log("   ✅ 2 transporters created (Swift Cargo, FastRoute Logistics)\n");

  // 4. Seed Users
  console.log("👤 Seeding users...");
  const adminId = crypto.randomUUID();
  const transporterUserId = crypto.randomUUID();
  const driverUserId = crypto.randomUUID();
  const customerId = crypto.randomUUID();

  await db.insert(users).values([
    {
      id: adminId,
      email: "admin@translogix.com",
      name: "Admin User",
      role: "ADMIN",
      emailVerified: true,
    },
    {
      id: transporterUserId,
      email: "transporter@translogix.com",
      name: "Transporter User",
      role: "TRANSPORTER",
      transporterId: swiftCargoId,
      emailVerified: true,
    },
    {
      id: driverUserId,
      email: "driver@translogix.com",
      name: "Driver User",
      role: "DRIVER",
      emailVerified: true,
    },
    {
      id: customerId,
      email: "customer@translogix.com",
      name: "Customer User",
      role: "CUSTOMER",
      emailVerified: true,
    },
  ]);

  // Create credential accounts for each user (BetterAuth uses this for email/password login)
  await db.insert(accounts).values([
    {
      id: crypto.randomUUID(),
      accountId: adminId,
      providerId: "credential",
      userId: adminId,
      password: passwordHash,
    },
    {
      id: crypto.randomUUID(),
      accountId: transporterUserId,
      providerId: "credential",
      userId: transporterUserId,
      password: passwordHash,
    },
    {
      id: crypto.randomUUID(),
      accountId: driverUserId,
      providerId: "credential",
      userId: driverUserId,
      password: passwordHash,
    },
    {
      id: crypto.randomUUID(),
      accountId: customerId,
      providerId: "credential",
      userId: customerId,
      password: passwordHash,
    },
  ]);

  console.log("   ✅ 4 users created with credential accounts\n");

  // 5. Seed Vehicles
  console.log("🚗 Seeding vehicles...");
  const vehicle1Id = crypto.randomUUID(); // MH-01-AB-1234 - Swift Cargo
  const vehicle2Id = crypto.randomUUID(); // MH-02-CD-5678 - Swift Cargo
  const vehicle3Id = crypto.randomUUID(); // MH-03-EF-9012 - Swift Cargo
  const vehicle4Id = crypto.randomUUID(); // KA-01-GH-3456 - FastRoute
  const vehicle5Id = crypto.randomUUID(); // KA-02-IJ-7890 - FastRoute

  await db.insert(vehicles).values([
    {
      id: vehicle1Id,
      vehicleNumber: "MH-01-AB-1234",
      transporterId: swiftCargoId,
      vehicleType: "TRUCK",
      capacityKg: 18000,
      currentLocation: "Mumbai",
      status: "AVAILABLE",
    },
    {
      id: vehicle2Id,
      vehicleNumber: "MH-02-CD-5678",
      transporterId: swiftCargoId,
      vehicleType: "TRUCK",
      capacityKg: 25000,
      currentLocation: "Chennai",
      status: "BUSY",
    },
    {
      id: vehicle3Id,
      vehicleNumber: "MH-03-EF-9012",
      transporterId: swiftCargoId,
      vehicleType: "VAN",
      capacityKg: 5000,
      currentLocation: "Bangalore",
      status: "AVAILABLE",
    },
    {
      id: vehicle4Id,
      vehicleNumber: "KA-01-GH-3456",
      transporterId: fastRouteId,
      vehicleType: "DUMPER",
      capacityKg: 30000,
      currentLocation: "Hyderabad",
      status: "AVAILABLE",
    },
    {
      id: vehicle5Id,
      vehicleNumber: "KA-02-IJ-7890",
      transporterId: fastRouteId,
      vehicleType: "TRUCK",
      capacityKg: 15000,
      currentLocation: "Kolkata",
      status: "MAINTENANCE",
    },
  ]);

  console.log("   ✅ 5 vehicles created (3 Swift Cargo, 2 FastRoute)\n");

  // 6. Seed Routes
  console.log("🗺️  Seeding routes...");
  const route1Id = crypto.randomUUID(); // Mumbai → Delhi
  const route2Id = crypto.randomUUID(); // Chennai → Bangalore
  const route3Id = crypto.randomUUID(); // Kolkata → Hyderabad

  await db.insert(routes).values([
    {
      id: route1Id,
      origin: "Mumbai",
      destination: "Delhi",
      distanceKm: "1400",
      estimatedTime: "24h",
      billingRate: "45000",
      vendorRate: "32000",
    },
    {
      id: route2Id,
      origin: "Chennai",
      destination: "Bangalore",
      distanceKm: "350",
      estimatedTime: "6h",
      billingRate: "12000",
      vendorRate: "8500",
    },
    {
      id: route3Id,
      origin: "Kolkata",
      destination: "Hyderabad",
      distanceKm: "1500",
      estimatedTime: "26h",
      billingRate: "50000",
      vendorRate: "36000",
    },
  ]);

  console.log("   ✅ 3 routes created\n");

  // 7. Seed Shipments
  console.log("📦 Seeding shipments...");
  const shipment1Id = crypto.randomUUID(); // PKG-001 CREATED
  const shipment2Id = crypto.randomUUID(); // PKG-002 ASSIGNED
  const shipment3Id = crypto.randomUUID(); // PKG-003 IN_TRANSIT
  const shipment4Id = crypto.randomUUID(); // PKG-004 DELIVERED
  const shipment5Id = crypto.randomUUID(); // PKG-005 PICKED_UP

  await db.insert(shipments).values([
    {
      id: shipment1Id,
      packageCode: "PKG-001",
      source: "Mumbai",
      destination: "Delhi",
      materialType: "Electronics",
      grossWeightKg: "12000",
      quantity: 200,
      pickupDate: daysFromNow(2),
      deliveryDeadline: daysFromNow(5),
      status: "CREATED",
    },
    {
      id: shipment2Id,
      packageCode: "PKG-002",
      source: "Chennai",
      destination: "Bangalore",
      materialType: "Textiles",
      grossWeightKg: "20000",
      quantity: 500,
      pickupDate: daysFromNow(1),
      deliveryDeadline: daysFromNow(3),
      transporterId: swiftCargoId,
      vehicleId: vehicle2Id,
      status: "ASSIGNED",
    },
    {
      id: shipment3Id,
      packageCode: "PKG-003",
      source: "Mumbai",
      destination: "Delhi",
      materialType: "Auto Parts",
      grossWeightKg: "15000",
      tareWeightKg: "500",
      quantity: 150,
      pickupDate: daysFromNow(-2),
      deliveryDeadline: daysFromNow(1),
      transporterId: swiftCargoId,
      vehicleId: vehicle1Id,
      routeId: route1Id,
      status: "IN_TRANSIT",
    },
    {
      id: shipment4Id,
      packageCode: "PKG-004",
      source: "Kolkata",
      destination: "Hyderabad",
      materialType: "Machinery",
      grossWeightKg: "25000",
      quantity: 50,
      pickupDate: daysFromNow(-7),
      deliveryDeadline: daysFromNow(-2),
      transporterId: fastRouteId,
      vehicleId: vehicle4Id,
      routeId: route3Id,
      status: "DELIVERED",
    },
    {
      id: shipment5Id,
      packageCode: "PKG-005",
      source: "Chennai",
      destination: "Bangalore",
      materialType: "Consumer Goods",
      grossWeightKg: "4000",
      quantity: 100,
      pickupDate: daysFromNow(-1),
      deliveryDeadline: daysFromNow(2),
      transporterId: swiftCargoId,
      vehicleId: vehicle3Id,
      routeId: route2Id,
      status: "PICKED_UP",
    },
  ]);

  console.log("   ✅ 5 shipments created (CREATED, ASSIGNED, IN_TRANSIT, DELIVERED, PICKED_UP)\n");

  // 8. Seed Tracking Updates
  console.log("📍 Seeding tracking updates...");

  // PKG-003 (IN_TRANSIT) — 4 tracking updates
  await db.insert(trackingUpdates).values([
    {
      id: crypto.randomUUID(),
      shipmentId: shipment3Id,
      location: "Package picked up from Mumbai warehouse",
      latitude: "19.0760",
      longitude: "72.8777",
      createdAt: hoursAgo(48),
    },
    {
      id: crypto.randomUUID(),
      shipmentId: shipment3Id,
      location: "Crossed Nashik checkpoint",
      latitude: "19.9975",
      longitude: "73.7898",
      createdAt: hoursAgo(36),
    },
    {
      id: crypto.randomUUID(),
      shipmentId: shipment3Id,
      location: "Arrived at Indore transit hub",
      latitude: "22.7196",
      longitude: "75.8577",
      createdAt: hoursAgo(18),
    },
    {
      id: crypto.randomUUID(),
      shipmentId: shipment3Id,
      location: "Departed Indore, en route to Delhi",
      latitude: "22.7196",
      longitude: "75.8577",
      createdAt: hoursAgo(6),
    },
  ]);

  // PKG-004 (DELIVERED) — 4 tracking updates
  await db.insert(trackingUpdates).values([
    {
      id: crypto.randomUUID(),
      shipmentId: shipment4Id,
      location: "Package picked up from Kolkata warehouse",
      latitude: "22.5726",
      longitude: "88.3639",
      createdAt: hoursAgo(168),
    },
    {
      id: crypto.randomUUID(),
      shipmentId: shipment4Id,
      location: "Passed through Visakhapatnam toll",
      latitude: "17.6868",
      longitude: "83.2185",
      createdAt: hoursAgo(144),
    },
    {
      id: crypto.randomUUID(),
      shipmentId: shipment4Id,
      location: "Arrived at Hyderabad distribution center",
      latitude: "17.3850",
      longitude: "78.4867",
      createdAt: hoursAgo(72),
    },
    {
      id: crypto.randomUUID(),
      shipmentId: shipment4Id,
      location: "Delivered to customer address in Hyderabad",
      latitude: "17.3850",
      longitude: "78.4867",
      createdAt: hoursAgo(60),
    },
  ]);

  console.log("   ✅ 8 tracking updates created (4 for PKG-003, 4 for PKG-004)\n");

  // 9. Summary
  console.log("═══════════════════════════════════════════");
  console.log("✨ Seed completed successfully!");
  console.log("═══════════════════════════════════════════");
  console.log("   👤 4 users (admin, transporter, driver, customer)");
  console.log("   🚛 2 transporters (Swift Cargo, FastRoute Logistics)");
  console.log("   🚗 5 vehicles (3 Swift Cargo, 2 FastRoute)");
  console.log("   🗺️  3 routes (Mumbai→Delhi, Chennai→Bangalore, Kolkata→Hyderabad)");
  console.log("   📦 5 shipments (various statuses)");
  console.log("   📍 8 tracking updates (PKG-003 & PKG-004)");
  console.log("═══════════════════════════════════════════");
  console.log("   🔑 Login credentials: <email> / password123");
  console.log("═══════════════════════════════════════════\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
