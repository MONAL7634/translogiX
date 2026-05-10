import { Metadata } from "next";
import { ShipmentForm } from "@/components/shipment-form";

export const metadata: Metadata = {
  title: "Edit Shipment | TransLogiX",
  description: "Update shipment details",
};

export default async function EditShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch shipment data server-side
  const { db } = await import("@/lib/db");
  const { shipments } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [shipment] = await db
    .select({
      id: shipments.id,
      packageCode: shipments.packageCode,
      source: shipments.source,
      destination: shipments.destination,
      materialType: shipments.materialType,
      grossWeightKg: shipments.grossWeightKg,
      tareWeightKg: shipments.tareWeightKg,
      quantity: shipments.quantity,
      pickupDate: shipments.pickupDate,
      deliveryDeadline: shipments.deliveryDeadline,
      transporterId: shipments.transporterId,
      vehicleId: shipments.vehicleId,
      routeId: shipments.routeId,
      status: shipments.status,
    })
    .from(shipments)
    .where(eq(shipments.id, id));

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-lg font-medium">Shipment not found</p>
        <p className="text-sm text-muted-foreground">
          The shipment you are looking for does not exist.
        </p>
      </div>
    );
  }

  return (
    <ShipmentForm
      role="ADMIN"
      shipmentId={id}
      initialData={{
        packageCode: shipment.packageCode,
        source: shipment.source,
        destination: shipment.destination,
        materialType: shipment.materialType,
        grossWeightKg: Number(shipment.grossWeightKg),
        tareWeightKg: shipment.tareWeightKg
          ? Number(shipment.tareWeightKg)
          : null,
        quantity: shipment.quantity,
        pickupDate: shipment.pickupDate,
        deliveryDeadline: shipment.deliveryDeadline,
        transporterId: shipment.transporterId,
        vehicleId: shipment.vehicleId,
        routeId: shipment.routeId,
      }}
    />
  );
}
