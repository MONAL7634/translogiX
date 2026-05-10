import { Metadata } from "next";
import { ShipmentForm } from "@/components/shipment-form";

export const metadata: Metadata = {
  title: "Edit Shipment | TransLogiX",
  description: "Update shipment details",
};

export default async function EditTransporterShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShipmentForm role="TRANSPORTER" shipmentId={id} />;
}
