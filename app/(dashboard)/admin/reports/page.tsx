"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  AlertTriangle,
  Download,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { STATUS_BADGE_COLORS } from "@/lib/validations";
import { exportToCsv } from "@/lib/utils/csv";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Shipment {
  id: string;
  packageCode: string;
  source: string;
  destination: string;
  materialType: string;
  grossWeightKg: string;
  tareWeightKg: string | null;
  quantity: number;
  pickupDate: string;
  deliveryDeadline: string;
  transporterId: string | null;
  vehicleId: string | null;
  routeId: string | null;
  status:
    | "CREATED"
    | "ASSIGNED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  transporterName: string | null;
  vehicleNumber: string | null;
}

interface Transporter {
  id: string;
  name: string;
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
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

// ─── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: typeof Package;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ─── Main Reports Page ──────────────────────────────────────────────────────

export default function ReportsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Filter state
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [transporterFilter, setTransporterFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ─── Fetch Data ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [shipmentsRes, transportersRes] = await Promise.all([
          fetch("/api/shipments", { credentials: "include" }),
          fetch("/api/transporters", { credentials: "include" }),
        ]);

        if (cancelled) return;

        if (!shipmentsRes.ok || !transportersRes.ok) {
          throw new Error("Failed to fetch reports data");
        }

        const [shipmentsData, transportersData] = await Promise.all([
          shipmentsRes.json(),
          transportersRes.json(),
        ]);

        if (!cancelled) {
          setShipments(shipmentsData.shipments ?? []);
          setTransporters(transportersData.transporters ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Reports fetch error:", err);
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred while loading reports."
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

  // ─── Filtered Shipments ───────────────────────────────────────────────────

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      // Status filter
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;

      // Transporter filter
      if (transporterFilter !== "ALL" && s.transporterId !== transporterFilter)
        return false;

      // Date range filter (based on createdAt)
      if (startDate) {
        const created = new Date(s.createdAt);
        const start = new Date(startDate);
        if (created < start) return false;
      }
      if (endDate) {
        const created = new Date(s.createdAt);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }

      return true;
    });
  }, [shipments, statusFilter, transporterFilter, startDate, endDate]);

  // ─── Summary Metrics ──────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = filteredShipments.length;
    const delivered = filteredShipments.filter(
      (s) => s.status === "DELIVERED"
    ).length;
    const pending = filteredShipments.filter(
      (s) => s.status === "CREATED"
    ).length;
    const cancelled = filteredShipments.filter(
      (s) => s.status === "CANCELLED"
    ).length;
    return { total, delivered, pending, cancelled };
  }, [filteredShipments]);

  // ─── CSV Export ────────────────────────────────────────────────────────────

  const handleExportCsv = () => {
    const rows = filteredShipments.map((s) => ({
      "Package Code": s.packageCode,
      Source: s.source,
      Destination: s.destination,
      "Material Type": s.materialType,
      Status: s.status.replace("_", " "),
      Transporter: s.transporterName ?? "",
      Vehicle: s.vehicleNumber ?? "",
      "Pickup Date": s.pickupDate,
      "Delivery Deadline": s.deliveryDeadline,
      "Created At": format(new Date(s.createdAt), "yyyy-MM-dd HH:mm:ss"),
    }));

    const filename = `translogix-shipments-report-${format(
      new Date(),
      "yyyy-MM-dd"
    )}.csv`;
    exportToCsv(rows, filename);
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return <ReportsSkeleton />;
  }

  // ─── Error State ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-1 text-muted-foreground">
            Shipment reports with filters and CSV export
          </p>
        </div>
        <ErrorState message={error} onRetry={handleRetry} />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-muted-foreground">
          Shipment reports with filters and CSV export
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Shipments"
          value={metrics.total}
          icon={FileText}
          color="text-blue-500"
        />
        <MetricCard
          title="Delivered"
          value={metrics.delivered}
          icon={CheckCircle}
          color="text-green-500"
        />
        <MetricCard
          title="Pending"
          value={metrics.pending}
          icon={Clock}
          color="text-yellow-500"
        />
        <MetricCard
          title="Cancelled"
          value={metrics.cancelled}
          icon={XCircle}
          color="text-red-500"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Status Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="CREATED">Created</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transporter Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Transporter
              </label>
              <Select
                value={transporterFilter}
                onValueChange={(v) => setTransporterFilter(v ?? "ALL")}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Transporters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Transporters</SelectItem>
                  {transporters.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                From Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                To Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Clear Filters */}
            {(statusFilter !== "ALL" ||
              transporterFilter !== "ALL" ||
              startDate ||
              endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("ALL");
                  setTransporterFilter("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={filteredShipments.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV ({filteredShipments.length} rows)
        </Button>
      </div>

      {/* Shipment Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Code</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Material Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Pickup Date</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.length > 0 ? (
                filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">
                      {shipment.packageCode}
                    </TableCell>
                    <TableCell>{shipment.source}</TableCell>
                    <TableCell>{shipment.destination}</TableCell>
                    <TableCell>{shipment.materialType}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_BADGE_COLORS[shipment.status] ?? ""
                        }
                      >
                        {shipment.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{shipment.transporterName ?? "—"}</TableCell>
                    <TableCell>{shipment.vehicleNumber ?? "—"}</TableCell>
                    <TableCell>
                      {format(new Date(shipment.pickupDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(shipment.deliveryDeadline),
                        "MMM d, yyyy"
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(shipment.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p>No shipments match the current filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
