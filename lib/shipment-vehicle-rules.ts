import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { shipments, vehicles } from "@/lib/db/schema";

export type ShipmentStatus =
  | "CREATED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export const ACTIVE_VEHICLE_SHIPMENT_STATUSES = [
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
] as const satisfies ShipmentStatus[];

export function isActiveVehicleShipmentStatus(status: string | null | undefined) {
  return (ACTIVE_VEHICLE_SHIPMENT_STATUSES as readonly string[]).includes(
    status ?? ""
  );
}

export function getShipmentStatusAfterVehicleAssignment(status: ShipmentStatus) {
  return status === "CREATED" ? "ASSIGNED" : status;
}

export function shouldReleaseVehicleForStatus(status: ShipmentStatus) {
  return status === "DELIVERED" || status === "CANCELLED";
}

export async function findActiveShipmentUsingVehicle(
  vehicleId: string,
  excludeShipmentId?: string
) {
  const conditions = [
    eq(shipments.vehicleId, vehicleId),
    inArray(shipments.status, ACTIVE_VEHICLE_SHIPMENT_STATUSES),
  ];

  if (excludeShipmentId) {
    conditions.push(ne(shipments.id, excludeShipmentId));
  }

  const [conflict] = await db
    .select({
      id: shipments.id,
      packageCode: shipments.packageCode,
      status: shipments.status,
    })
    .from(shipments)
    .where(and(...conditions))
    .limit(1);

  return conflict ?? null;
}

export async function getVehicleAssignmentBlocker(
  vehicleId: string,
  excludeShipmentId?: string
) {
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId));
  if (!vehicle) {
    return { vehicle: null, error: "Vehicle not found", status: 404 as const };
  }

  const conflict = await findActiveShipmentUsingVehicle(vehicleId, excludeShipmentId);
  if (conflict) {
    return {
      vehicle,
      error: `Vehicle is already assigned to active shipment ${conflict.packageCode}`,
      status: 409 as const,
    };
  }

  if (vehicle.status !== "AVAILABLE") {
    return {
      vehicle,
      error: "Vehicle is not available",
      status: 409 as const,
    };
  }

  return { vehicle, error: null, status: null };
}

export async function syncVehicleStatusFromActiveShipments(vehicleId: string) {
  const conflict = await findActiveShipmentUsingVehicle(vehicleId);
  await db
    .update(vehicles)
    .set({
      status: conflict ? "BUSY" : "AVAILABLE",
      updatedAt: new Date(),
    })
    .where(eq(vehicles.id, vehicleId));
}
