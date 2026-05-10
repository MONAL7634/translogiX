import { Metadata } from "next";
import { VehicleForm } from "@/components/vehicle-form";

export const metadata: Metadata = {
  title: "Add Vehicle | TransLogiX",
  description: "Register a new vehicle",
};

export default function NewAdminVehiclePage() {
  return <VehicleForm role="ADMIN" />;
}
