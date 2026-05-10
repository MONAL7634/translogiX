import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as Record<string, unknown>).role as string;

  switch (role) {
    case "ADMIN":
      redirect("/admin");
    case "TRANSPORTER":
      redirect("/transporter");
    case "DRIVER":
      redirect("/driver");
    case "CUSTOMER":
      redirect("/customer");
    default:
      redirect("/customer");
  }
}
