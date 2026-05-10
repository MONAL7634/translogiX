"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  IndianRupee,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { STATUS_BADGE_COLORS } from "@/lib/validations";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalTransporters: number;
  totalVehicles: number;
  activeShipments: number;
  completedShipments: number;
  pendingShipments: number;
  revenue: string;
}

interface RecentShipment {
  id: string;
  packageCode: string;
  source: string;
  destination: string;
  status: string;
  transporterName: string | null;
  createdAt: string;
}

interface ShipmentStat {
  status: string;
  count: number;
}

// Status colors for the bar chart
const CHART_COLORS: Record<string, string> = {
  CREATED: "#6b7280",
  ASSIGNED: "#3b82f6",
  PICKED_UP: "#eab308",
  IN_TRANSIT: "#f97316",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

// ─── Loading Skeletons ──────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

function RecentShipmentsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Error State ────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-center text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  formatter,
}: {
  title: string;
  value: number | string;
  icon: typeof Truck;
  formatter?: (val: number | string) => string;
}) {
  const displayValue = formatter ? formatter(value) : String(value);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    return (
      <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value} shipment{payload[0].value !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [shipmentStats, setShipmentStats] = useState<ShipmentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, recentRes, chartRes] = await Promise.all([
          fetch("/api/dashboard/stats", { credentials: "include" }),
          fetch("/api/dashboard/recent-shipments", { credentials: "include" }),
          fetch("/api/dashboard/shipment-stats", { credentials: "include" }),
        ]);

        if (cancelled) return;

        if (!statsRes.ok || !recentRes.ok || !chartRes.ok) {
          const failedRes = !statsRes.ok
            ? statsRes
            : !recentRes.ok
            ? recentRes
            : chartRes;
          throw new Error(
            `Failed to fetch dashboard data (${failedRes.status})`
          );
        }

        const [statsData, recentData, chartData] = await Promise.all([
          statsRes.json(),
          recentRes.json(),
          chartRes.json(),
        ]);

        if (!cancelled) {
          setStats(statsData);
          setRecentShipments(recentData.shipments ?? []);
          setShipmentStats(chartData.stats ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard fetch error:", err);
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred while loading the dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your logistics operations
          </p>
        </div>
        <StatsCardsSkeleton />
        <ChartSkeleton />
        <RecentShipmentsSkeleton />
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your logistics operations
          </p>
        </div>
        <ErrorState message={error} onRetry={handleRetry} />
      </div>
    );
  }

  // ─── Format chart data labels ─────────────────────────────────────────────

  const chartData = shipmentStats.map((s) => ({
    ...s,
    label: STATUS_LABELS[s.status] ?? s.status,
  }));

  // ─── Format revenue ──────────────────────────────────────────────────────

  const formatRevenue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "₹0";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your logistics operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Transporters"
          value={stats?.totalTransporters ?? 0}
          icon={Truck}
        />
        <StatCard
          title="Total Vehicles"
          value={stats?.totalVehicles ?? 0}
          icon={Truck}
        />
        <StatCard
          title="Active Shipments"
          value={stats?.activeShipments ?? 0}
          icon={Package}
        />
        <StatCard
          title="Completed"
          value={stats?.completedShipments ?? 0}
          icon={CheckCircle}
        />
        <StatCard
          title="Pending"
          value={stats?.pendingShipments ?? 0}
          icon={Clock}
        />
        <StatCard
          title="Revenue"
          value={stats?.revenue ?? "0"}
          icon={IndianRupee}
          formatter={formatRevenue}
        />
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Shipment Volume by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 && chartData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={CHART_COLORS[entry.status] ?? "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No shipment data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Shipments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Shipments
          </CardTitle>
          <Link href="/admin/shipments">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentShipments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Code</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentShipments.map((shipment) => (
                  <TableRow
                    key={shipment.id}
                    className="cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/admin/shipments/${shipment.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/shipments/${shipment.id}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {shipment.packageCode}
                      </Link>
                    </TableCell>
                    <TableCell>{shipment.source}</TableCell>
                    <TableCell>{shipment.destination}</TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_BADGE_COLORS[shipment.status] ?? ""}
                      >
                        {shipment.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{shipment.transporterName ?? "—"}</TableCell>
                    <TableCell>
                      {format(new Date(shipment.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No recent shipments found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
