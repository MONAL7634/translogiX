import { Metadata } from "next";
import { ShipmentForm } from "@/components/shipment-form";

export const metadata: Metadata = {
  title: "Add Shipment | TransLogiX",
  description: "Create a new shipment",
};

export default function NewShipmentPage() {
  return <ShipmentForm role="ADMIN" />;
}
