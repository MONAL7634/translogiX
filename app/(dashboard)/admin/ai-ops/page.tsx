"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  BrainCircuit,
  Clock,
  Gauge,
  MapPin,
  RefreshCw,
  Route,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface OperationsData {
  generatedAt: string;
  integrations: {
    googleMapsBrowser: boolean;
    googleRoutesTraffic: boolean;
    openWeather: boolean;
  };
  summary: {
    activeShipments: number;
    trackedVehicles: number;
    rerouteSuggestions: number;
    highDelayCount: number;
    highMaintenanceCount: number;
  };
  liveTracking: Array<{
    shipmentId: string;
    packageCode: string;
    status: string;
    vehicleNumber: string;
    transporterName: string;
    location: string;
    latitude: number;
    longitude: number;
    updatedAt: string | null;
  }>;
  routeRecommendations: Array<{
    shipmentId: string;
    packageCode: string;
    recommendedRouteId: string | null;
    currentRoute: string;
    recommendedRoute: string;
    trafficLevel: string;
    weatherCondition: string;
    predictedHours: number;
    trafficSource: "google-routes" | "estimated";
    weatherSource: "openweather" | "estimated";
    distanceKm: number;
    savedHours: number;
    reason: string;
  }>;
  optimizationSuggestions: Array<{
    shipmentId: string;
    packageCode: string;
    recommendedVehicleId: string | null;
    recommendedRouteId: string | null;
    recommendedVehicle: string;
    recommendedRoute: string;
    confidence: number;
    reason: string;
  }>;
  delayPredictions: Array<{
    shipmentId: string;
    packageCode: string;
    status: string;
    destination: string;
    etaHours: number;
    predictedDelivery: string;
    deadline: string;
    delayHours: number;
    riskLevel: "Low" | "Medium" | "High";
    factors: string[];
  }>;
  maintenancePredictions: Array<{
    vehicleId: string;
    vehicleNumber: string;
    status: string;
    activeLoad: number;
    daysSinceMaintenance: number;
    riskScore: number;
    riskLevel: "Low" | "Medium" | "High";
    recommendation: string;
  }>;
}

interface GoogleMapInstance {
  fitBounds(bounds: GoogleLatLngBounds): void;
  setCenter(position: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
}

interface GoogleMarkerInstance {
  setMap(map: GoogleMapInstance | null): void;
}

interface GoogleLatLngBounds {
  extend(position: { lat: number; lng: number }): void;
}

interface GoogleMapsNamespace {
  Map?: GoogleMapsRuntime["Map"];
  Marker?: GoogleMapsRuntime["Marker"];
  LatLngBounds?: GoogleMapsRuntime["LatLngBounds"];
  importLibrary?: (
    library: "maps" | "marker"
  ) => Promise<Record<string, unknown>>;
}

declare global {
  interface Window {
    google?: {
      maps: GoogleMapsNamespace;
    };
    __initGoogleMaps?: () => void;
  }
}

interface GoogleMapsRuntime {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>
  ) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  LatLngBounds: new () => GoogleLatLngBounds;
}

let googleMapsPromise: Promise<GoogleMapsRuntime> | null = null;

function getGoogleMapsRuntime(): GoogleMapsRuntime | null {
  const maps = window.google?.maps;
  if (!maps?.Map || !maps.Marker || !maps.LatLngBounds) return null;

  return {
    Map: maps.Map,
    Marker: maps.Marker,
    LatLngBounds: maps.LatLngBounds,
  };
}

function loadGoogleMaps(apiKey: string): Promise<GoogleMapsRuntime> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }

  const loadedRuntime = getGoogleMapsRuntime();
  if (loadedRuntime) return Promise.resolve(loadedRuntime);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    window.__initGoogleMaps = () => resolve();

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      loading: "async",
      callback: "__initGoogleMaps",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  }).then(async () => {
    delete window.__initGoogleMaps;

    const maps = window.google?.maps;
    if (!maps) throw new Error("Google Maps failed to initialize");

    const mapsLibrary = maps.importLibrary
      ? await maps.importLibrary("maps")
      : {};
    const markerLibrary = maps.importLibrary
      ? await maps.importLibrary("marker")
      : {};

    const runtime: GoogleMapsRuntime = {
      Map: (mapsLibrary.Map ?? maps.Map) as GoogleMapsRuntime["Map"],
      Marker: (markerLibrary.Marker ?? maps.Marker) as GoogleMapsRuntime["Marker"],
      LatLngBounds: (mapsLibrary.LatLngBounds ??
        maps.LatLngBounds) as GoogleMapsRuntime["LatLngBounds"],
    };

    if (!runtime.Map || !runtime.Marker || !runtime.LatLngBounds) {
      throw new Error("Google Maps did not expose the required map classes");
    }

    return runtime;
  });

  return googleMapsPromise;
}

function riskClass(level: string) {
  if (level === "High") return "border-red-200 bg-red-50 text-red-700";
  if (level === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function OperationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[360px] rounded-lg" />
      <Skeleton className="h-[280px] rounded-lg" />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Truck;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function GoogleTrackingMap({
  points,
  apiKey,
}: {
  points: OperationsData["liveTracking"];
  apiKey: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!containerRef.current) return;

      try {
        const maps = await loadGoogleMaps(apiKey);
        if (cancelled || !containerRef.current) return;

        const center = points[0]
          ? { lat: points[0].latitude, lng: points[0].longitude }
          : { lat: 20.5937, lng: 78.9629 };

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center,
            zoom: points.length > 1 ? 5 : 6,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }
        const map = mapRef.current;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        if (points.length === 0) {
          map.setCenter(center);
          map.setZoom(5);
          return;
        }

        const bounds = new maps.LatLngBounds();
        markersRef.current = points.map((point) => {
          const position = { lat: point.latitude, lng: point.longitude };
          bounds.extend(position);
          return new maps.Marker({
            position,
            map,
            title: `${point.packageCode} · ${point.vehicleNumber}`,
            label: point.packageCode.slice(-2),
          });
        });

        if (points.length === 1) {
          map.setCenter(center);
          map.setZoom(9);
        } else {
          map.fitBounds(bounds);
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(
            error instanceof Error ? error.message : "Google Maps failed to load"
          );
        }
      }
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [apiKey, points]);

  return (
    <div className="relative h-[360px] overflow-hidden rounded-md border">
      <div ref={containerRef} className="h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6 text-center text-sm text-muted-foreground">
          {mapError}
        </div>
      )}
      {points.length === 0 && !mapError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 text-muted-foreground">
          No active GPS signals yet
        </div>
      )}
    </div>
  );
}

export default function AiOperationsPage() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/operations-intelligence", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load AI operations data (${response.status})`);
        }

        const payload = (await response.json()) as OperationsData;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load operations data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const applyOperationsAction = async (
    actionKey: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    setApplyingAction(actionKey);
    try {
      const response = await fetch("/api/operations-intelligence/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to apply recommendation");
      }

      toast.success(successMessage);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to apply recommendation"
      );
    } finally {
      setApplyingAction(null);
    }
  };

  if (loading) return <OperationsSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Operations</h1>
          <p className="mt-1 text-muted-foreground">
            Live route, vehicle, delay, and maintenance intelligence
          </p>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-center text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
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
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BrainCircuit className="h-6 w-6" />
            AI Operations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Basic live tracking, rerouting, optimization, delay, and maintenance predictions
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={data.integrations.googleRoutesTraffic ? "default" : "outline"}>
              {data.integrations.googleRoutesTraffic ? "Google traffic live" : "Traffic estimated"}
            </Badge>
            <Badge variant={data.integrations.openWeather ? "default" : "outline"}>
              {data.integrations.openWeather ? "Weather live" : "Weather estimated"}
            </Badge>
            <Badge variant={googleMapsApiKey ? "default" : "outline"}>
              {googleMapsApiKey ? "Google map live" : "Map key required"}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setRefreshKey((key) => key + 1)}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Active Shipments"
          value={data.summary.activeShipments}
          icon={Truck}
        />
        <SummaryCard
          title="GPS Signals"
          value={data.summary.trackedVehicles}
          icon={MapPin}
        />
        <SummaryCard
          title="Reroutes"
          value={data.summary.rerouteSuggestions}
          icon={Route}
        />
        <SummaryCard
          title="Delay Alerts"
          value={data.summary.highDelayCount}
          icon={Clock}
        />
        <SummaryCard
          title="Maintenance Alerts"
          value={data.summary.highMaintenanceCount}
          icon={Wrench}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live GPS Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {googleMapsApiKey ? (
              <GoogleTrackingMap
                points={data.liveTracking}
                apiKey={googleMapsApiKey}
              />
            ) : (
              <div className="flex h-[360px] items-center justify-center rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to render the actual Google Map.
                GPS data is still coming from tracking updates and will appear here once
                the key is configured.
              </div>
            )}
            {data.liveTracking.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.liveTracking.map((point) => (
                  <div key={point.shipmentId} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{point.packageCode}</span>
                      <Badge variant="outline">{point.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {point.vehicleNumber} at {point.location}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </p>
                  </div>
                ))}
              </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI/ML Route Optimization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.optimizationSuggestions.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-center text-muted-foreground">
                No unassigned created shipments need optimization.
              </div>
            ) : (
              data.optimizationSuggestions.map((item) => (
                <div key={item.shipmentId} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.packageCode}</p>
                    <Badge variant="secondary">{item.confidence}% fit</Badge>
                  </div>
                  <p className="mt-2 text-sm">
                    {item.recommendedVehicle} via {item.recommendedRoute}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={
                      !item.recommendedVehicleId ||
                      applyingAction === `assign:${item.shipmentId}`
                    }
                    onClick={() =>
                      applyOperationsAction(
                        `assign:${item.shipmentId}`,
                        {
                          action: "assign",
                          shipmentId: item.shipmentId,
                          vehicleId: item.recommendedVehicleId,
                          routeId: item.recommendedRouteId ?? undefined,
                        },
                        `${item.packageCode} assigned from AI Ops`
                      )
                    }
                  >
                    {applyingAction === `assign:${item.shipmentId}`
                      ? "Applying..."
                      : "Assign"}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Traffic, Road, and Weather Rerouting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Recommended Route</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.routeRecommendations.map((item) => (
                <TableRow key={item.shipmentId}>
                  <TableCell className="font-medium">{item.packageCode}</TableCell>
                  <TableCell>
                    <div>{item.recommendedRoute}</div>
                    <div className="text-xs text-muted-foreground">
                      Current: {item.currentRoute}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{item.trafficLevel}</Badge>
                      <Badge variant="outline">{item.weatherCondition}</Badge>
                      <Badge variant="outline">{item.distanceKm} km</Badge>
                      <Badge variant="outline">
                        {item.trafficSource === "google-routes" ? "Google" : "Estimated"} traffic
                      </Badge>
                      <Badge variant="outline">
                        {item.weatherSource === "openweather" ? "Live" : "Estimated"} weather
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{item.predictedHours}h</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {item.savedHours > 0 ? `${item.savedHours}h saved` : "Keep route"}
                    </span>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      disabled={
                        !item.recommendedRouteId ||
                        item.savedHours <= 0 ||
                        applyingAction === `reroute:${item.shipmentId}`
                      }
                      onClick={() =>
                        applyOperationsAction(
                          `reroute:${item.shipmentId}`,
                          {
                            action: "reroute",
                            shipmentId: item.shipmentId,
                            routeId: item.recommendedRouteId,
                          },
                          `${item.packageCode} rerouted`
                        )
                      }
                    >
                      {applyingAction === `reroute:${item.shipmentId}`
                        ? "Applying..."
                        : "Apply Route"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.routeRecommendations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No active shipments to reroute.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Predictive Delay Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.delayPredictions.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                No active shipments to score.
              </div>
            ) : (
              data.delayPredictions.map((item) => (
                <div key={item.shipmentId} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.packageCode}</p>
                      <p className="text-sm text-muted-foreground">
                        ETA {item.etaHours}h to {item.destination}
                      </p>
                    </div>
                    <Badge className={cn("border", riskClass(item.riskLevel))}>
                      {item.riskLevel}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.factors.map((factor) => (
                      <Badge key={factor} variant="outline">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Predictive Vehicle Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.maintenancePredictions.map((item) => (
              <div key={item.vehicleId} className="rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.vehicleNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.daysSinceMaintenance} days since service · {item.activeLoad} active loads
                    </p>
                  </div>
                  <Badge className={cn("border", riskClass(item.riskLevel))}>
                    {item.riskScore}/100
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {item.recommendation}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={
                    item.status === "MAINTENANCE" ||
                    applyingAction === `maintenance:${item.vehicleId}`
                  }
                  onClick={() =>
                    applyOperationsAction(
                      `maintenance:${item.vehicleId}`,
                      {
                        action: "schedule-maintenance",
                        vehicleId: item.vehicleId,
                      },
                      `${item.vehicleNumber} marked for maintenance`
                    )
                  }
                >
                  {item.status === "MAINTENANCE"
                    ? "Already in Maintenance"
                    : applyingAction === `maintenance:${item.vehicleId}`
                      ? "Applying..."
                      : "Mark Maintenance"}
                </Button>
              </div>
            ))}
            {data.maintenancePredictions.length === 0 && (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                No vehicles available to score.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
