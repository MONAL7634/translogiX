import { Metadata } from "next";
import { RouteForm } from "@/components/route-form";

export const metadata: Metadata = {
  title: "Edit Route | TransLogiX",
  description: "Update route details",
};

export default function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <RouteEditWrapper params={params} />;
}

async function RouteEditWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch route data server-side
  const { db } = await import("@/lib/db");
  const { routes } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [route] = await db
    .select()
    .from(routes)
    .where(eq(routes.id, id));

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-lg font-medium">Route not found</p>
        <p className="text-sm text-muted-foreground">
          The route you are looking for does not exist.
        </p>
      </div>
    );
  }

  return (
    <RouteForm
      routeId={id}
      initialData={{
        origin: route.origin,
        destination: route.destination,
        distanceKm: Number(route.distanceKm),
        estimatedTime: route.estimatedTime,
        billingRate: Number(route.billingRate),
        vendorRate: Number(route.vendorRate),
      }}
    />
  );
}
