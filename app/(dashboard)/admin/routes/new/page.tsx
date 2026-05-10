import { Metadata } from "next";
import { RouteForm } from "@/components/route-form";

export const metadata: Metadata = {
  title: "Add Route | TransLogiX",
  description: "Create a new transport route",
};

export default function NewRoutePage() {
  return <RouteForm />;
}
