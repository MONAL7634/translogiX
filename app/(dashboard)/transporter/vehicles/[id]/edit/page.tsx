"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VehicleForm } from "@/components/vehicle-form";

export default function EditTransporterVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [transporterId, setTransporterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const { id } = await params;
        setVehicleId(id);

        const response = await fetch("/api/auth/get-session", {
          credentials: "include",
        });
        if (!response.ok) {
          router.push("/login");
          return;
        }
        const data = await response.json();
        if (!data?.user) {
          router.push("/login");
          return;
        }
        setTransporterId(data.user.transporterId || null);
      } catch {
        router.push("/transporter/vehicles");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params, router]);

  if (loading || !vehicleId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!transporterId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-lg font-medium">No transporter account linked</p>
        <p className="text-sm text-muted-foreground">
          Your account is not associated with a transporter. Please contact an administrator.
        </p>
      </div>
    );
  }

  return <VehicleForm role="TRANSPORTER" transporterId={transporterId} vehicleId={vehicleId} />;
}
