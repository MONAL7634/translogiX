import { Metadata } from "next";
import { DriverPanelClient } from "@/components/driver-panel-client";

export const metadata: Metadata = {
  title: "My Shipments | TransLogiX",
  description: "View and manage your assigned shipments",
};

export default function DriverShipmentsPage() {
  return <DriverPanelClient />;
}
