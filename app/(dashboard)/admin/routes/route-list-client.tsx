"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Pencil,
  RefreshCw,
  AlertTriangle,
  Route as RouteIcon,
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface Route {
  id: string;
  origin: string;
  destination: string;
  distanceKm: string;
  estimatedTime: string;
  billingRate: string;
  vendorRate: string;
  createdAt: string;
  updatedAt: string;
}

export function RouteListClient() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);

        const response = await fetch(`/api/routes?${params.toString()}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error("Failed to fetch routes");
        }

        const data = await response.json();
        if (!cancelled) {
          setRoutes(data.routes);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred"
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
  }, [debouncedSearch, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const formatDistance = (km: string) => {
    const num = Number(km);
    return `${num.toLocaleString()} km`;
  };

  const formatCurrency = (amount: string) => {
    const num = Number(amount);
    return `₹${num.toLocaleString()}`;
  };

  if (loading) {
    return <RouteListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load routes</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Routes</h1>
          <p className="text-muted-foreground">
            Manage your transport routes
          </p>
        </div>
        <Link href="/admin/routes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Route
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by origin or destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origin</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Est. Time</TableHead>
              <TableHead>Billing Rate</TableHead>
              <TableHead>Vendor Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {search
                    ? "No routes match your search."
                    : "No routes found."}
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-muted-foreground" />
                      {route.origin}
                    </div>
                  </TableCell>
                  <TableCell>{route.destination}</TableCell>
                  <TableCell>{formatDistance(route.distanceKm)}</TableCell>
                  <TableCell>{route.estimatedTime}</TableCell>
                  <TableCell>{formatCurrency(route.billingRate)}</TableCell>
                  <TableCell>{formatCurrency(route.vendorRate)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/routes/${route.id}/edit`}>
                      <Button variant="ghost" size="icon-sm">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RouteListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="rounded-md border">
        <div className="space-y-0">
          <div className="flex h-10 items-center gap-4 border-b px-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="flex h-14 items-center gap-4 px-4 border-b last:border-0"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                <Skeleton key={col} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
