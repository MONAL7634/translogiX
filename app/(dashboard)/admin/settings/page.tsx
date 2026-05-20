"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudSun, KeyRound, Map, RefreshCw, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionPayload {
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

interface OperationsPayload {
  generatedAt: string;
  integrations: {
    googleMapsBrowser: boolean;
    googleRoutesTraffic: boolean;
    openWeather: boolean;
  };
}

export default function AdminSettingsPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [ops, setOps] = useState<OperationsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const [sessionResponse, opsResponse] = await Promise.all([
          fetch("/api/auth/get-session", { credentials: "include" }),
          fetch("/api/operations-intelligence", { credentials: "include" }),
        ]);
        if (!sessionResponse.ok) throw new Error("Failed to load profile");
        if (!opsResponse.ok) throw new Error("Failed to load integration health");
        const [sessionPayload, opsPayload] = await Promise.all([
          sessionResponse.json(),
          opsResponse.json(),
        ]);
        if (!cancelled) {
          setSession(sessionPayload);
          setOps(opsPayload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" className="gap-2" onClick={() => setRefreshKey((key) => key + 1)}>
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Profile and provider readiness for live operations features.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setRefreshKey((key) => key + 1)}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Signed-in Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <ProfileItem label="Name" value={session?.user?.name ?? "Unknown"} />
          <ProfileItem label="Email" value={session?.user?.email ?? "Unknown"} />
          <ProfileItem label="Role" value={session?.user?.role ?? "Unknown"} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ProviderCard
          title="Google Map"
          icon={Map}
          ready={Boolean(ops?.integrations.googleMapsBrowser)}
          enabledText="Browser map key is configured."
          missingText="Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to render the map on AI Ops."
        />
        <ProviderCard
          title="Google Routes"
          icon={Route}
          ready={Boolean(ops?.integrations.googleRoutesTraffic)}
          enabledText="Traffic-aware route scoring is live."
          missingText="Set GOOGLE_MAPS_API_KEY to replace estimated traffic scoring."
        />
        <ProviderCard
          title="OpenWeather"
          icon={CloudSun}
          ready={Boolean(ops?.integrations.openWeather)}
          enabledText="Weather delay scoring is live."
          missingText="Set OPENWEATHER_API_KEY to replace estimated weather scoring."
        />
      </div>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}

function ProviderCard({
  title,
  icon: Icon,
  ready,
  enabledText,
  missingText,
}: {
  title: string;
  icon: typeof Map;
  ready: boolean;
  enabledText: string;
  missingText: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            {title}
          </span>
          <Badge variant={ready ? "default" : "outline"}>
            {ready ? "Live" : "Estimated"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="flex gap-2 text-sm text-muted-foreground">
          {ready && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
          {ready ? enabledText : missingText}
        </p>
      </CardContent>
    </Card>
  );
}
