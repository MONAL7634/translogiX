import { Metadata } from "next";
import { ShipmentListClient } from "./shipment-list-client";

export const metadata: Metadata = {
  title: "Shipments | TransLogiX",
  description: "Manage all shipments",
};

export default function ShipmentsPage() {
  return <ShipmentListClient role="ADMIN" />;
}
