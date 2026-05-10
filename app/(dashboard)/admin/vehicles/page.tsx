import { Metadata } from "next";
import { VehicleListClient } from "./vehicle-list-client";

export const metadata: Metadata = {
  title: "Vehicles | TransLogiX",
  description: "Manage all vehicles",
};

export default function AdminVehiclesPage() {
  return <VehicleListClient role="ADMIN" />;
}
