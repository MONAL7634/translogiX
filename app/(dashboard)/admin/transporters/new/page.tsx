import { Metadata } from "next";
import { TransporterForm } from "./transporter-form";

export const metadata: Metadata = {
  title: "Add Transporter | TransLogiX",
  description: "Add a new transport company",
};

export default function NewTransporterPage() {
  return <TransporterForm />;
}
