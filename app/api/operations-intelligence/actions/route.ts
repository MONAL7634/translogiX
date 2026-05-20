import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { routes, shipments, vehicles } from "@/lib/db/schema";
import { requireTransporterScope } from "@/lib/auth/api-utils";
import {
  getShipmentStatusAfterVehicleAssignment,
  getVehicleAssignmentBlocker,
  findActiveShipmentUsingVehicle,
  type ShipmentStatus,
} from "@/lib/shipment-vehicle-rules";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reroute"),
    shipmentId: z.string().uuid(),
    routeId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("assign"),
    shipmentId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    routeId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("schedule-maintenance"),
    vehicleId: z.string().uuid(),
  }),
]);

export async function POST(request: NextRequest) {
  const authResult = await requireTransporterScope(request);
  if (authResult.error) return authResult.error;

  try {
    const body = actionSchema.parse(await request.json());

    if (body.action === "schedule-maintenance") {
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, body.vehicleId));
      if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      if (authResult.transporterId && vehicle.transporterId !== authResult.transporterId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const activeShipment = await findActiveShipmentUsingVehicle(body.vehicleId);
      if (activeShipment) {
        return NextResponse.json(
          {
            error: `Vehicle is assigned to active shipment ${activeShipment.packageCode}`,
          },
          { status: 409 }
        );
      }

      const [updatedVehicle] = await db
        .update(vehicles)
        .set({ status: "MAINTENANCE", updatedAt: new Date() })
        .where(eq(vehicles.id, body.vehicleId))
        .returning();

      return NextResponse.json({
        message: "Vehicle marked for maintenance",
        vehicle: updatedVehicle,
      });
    }

    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, body.shipmentId));
    if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    if (authResult.transporterId && shipment.transporterId !== authResult.transporterId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.action === "reroute") {
      const [route] = await db.select().from(routes).where(eq(routes.id, body.routeId));
      if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });

      const [updatedShipment] = await db
        .update(shipments)
        .set({ routeId: body.routeId, updatedAt: new Date() })
        .where(eq(shipments.id, body.shipmentId))
        .returning();

      return NextResponse.json({
        message: "Shipment route updated",
        shipment: updatedShipment,
      });
    }

    const vehicleCheck = await getVehicleAssignmentBlocker(body.vehicleId, body.shipmentId);
    if (vehicleCheck.error) {
      return NextResponse.json(
        { error: vehicleCheck.error },
        { status: vehicleCheck.status ?? 400 }
      );
    }
    const vehicle = vehicleCheck.vehicle;
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (authResult.transporterId && vehicle.transporterId !== authResult.transporterId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updatedShipment] = await db
      .update(shipments)
      .set({
        transporterId: vehicle.transporterId,
        vehicleId: body.vehicleId,
        ...(body.routeId && { routeId: body.routeId }),
        status: getShipmentStatusAfterVehicleAssignment(shipment.status as ShipmentStatus),
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, body.shipmentId))
      .returning();

    await db
      .update(vehicles)
      .set({ status: "BUSY", updatedAt: new Date() })
      .where(eq(vehicles.id, body.vehicleId));

    return NextResponse.json({
      message: "Shipment assigned",
      shipment: updatedShipment,
    });
  } catch (error) {
    console.error("Error applying operations action:", error);
    return NextResponse.json({ error: "Failed to apply action" }, { status: 500 });
  }
}
