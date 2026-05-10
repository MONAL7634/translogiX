import { Metadata } from "next";
import { TransporterListClient } from "./transporter-list-client";

export const metadata: Metadata = {
  title: "Transporters | TransLogiX",
  description: "Manage transport companies",
};

export default function TransportersPage() {
  return <TransporterListClient />;
}
