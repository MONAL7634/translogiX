import { Metadata } from "next";
import { VehicleForm } from "@/components/vehicle-form";

export const metadata: Metadata = {
  title: "Edit Vehicle | TransLogiX",
  description: "Edit vehicle details",
};

export default async function EditAdminVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleForm role="ADMIN" vehicleId={id} />;
}
