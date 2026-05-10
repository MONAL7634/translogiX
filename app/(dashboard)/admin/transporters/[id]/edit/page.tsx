import { Metadata } from "next";
import { EditTransporterForm } from "./edit-transporter-form";

export const metadata: Metadata = {
  title: "Edit Transporter | TransLogiX",
  description: "Edit transporter details",
};

export default async function EditTransporterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditTransporterForm transporterId={id} />;
}
