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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Pencil,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface Transporter {
  id: string;
  name: string;
  gstNumber: string | null;
  contactPerson: string;
  phone: string;
  email: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export function TransporterListClient() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    transporter: Transporter | null;
  }>({ open: false, transporter: null });
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

        const response = await fetch(`/api/transporters?${params.toString()}`, {
          credentials: "include",
        });

        if (cancelled) return;

        if (!response.ok) {
          throw new Error("Failed to fetch transporters");
        }

        const data = await response.json();
        if (!cancelled) {
          setTransporters(data.transporters);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedSearch, retryKey]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const handleToggleStatus = async (transporter: Transporter) => {
    const newStatus = transporter.status === "active" ? "inactive" : "active";
    setTogglingId(transporter.id);

    try {
      const response = await fetch(`/api/transporters/${transporter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update transporter status");
      }

      setTransporters((prev) =>
        prev.map((t) =>
          t.id === transporter.id ? { ...t, status: newStatus } : t
        )
      );

      toast.success(
        `Transporter "${transporter.name}" is now ${newStatus}`
      );
    } catch {
      toast.error("Failed to update transporter status");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTransporters = transporters;

  if (loading) {
    return <TransporterListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Failed to load transporters</p>
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
          <h1 className="text-2xl font-bold">Transporters</h1>
          <p className="text-muted-foreground">
            Manage your transport companies
          </p>
        </div>
        <Link href="/admin/transporters/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Transporter
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, contact, or phone..."
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
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransporters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {search
                    ? "No transporters match your search."
                    : "No transporters found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransporters.map((transporter) => (
                <TableRow key={transporter.id}>
                  <TableCell className="font-medium">
                    {transporter.name}
                  </TableCell>
                  <TableCell>{transporter.contactPerson}</TableCell>
                  <TableCell>{transporter.phone}</TableCell>
                  <TableCell>{transporter.email || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transporter.status === "active"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {transporter.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/transporters/${transporter.id}/edit`}>
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={togglingId === transporter.id}
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            transporter,
                          })
                        }
                      >
                        {transporter.status === "active" ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {transporter.status === "active"
                            ? "Disable"
                            : "Enable"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, transporter: confirmDialog.transporter })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.transporter?.status === "active"
                ? "Disable Transporter"
                : "Enable Transporter"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.transporter?.status === "active"
                ? `Are you sure you want to disable "${confirmDialog.transporter?.name}"? They will be marked as inactive.`
                : `Are you sure you want to enable "${confirmDialog.transporter?.name}"? They will be marked as active.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, transporter: null })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmDialog.transporter) {
                  handleToggleStatus(confirmDialog.transporter);
                }
                setConfirmDialog({ open: false, transporter: null });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransporterListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="rounded-md border">
        <div className="space-y-0">
          <div className="flex h-10 items-center gap-4 border-b px-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex h-14 items-center gap-4 px-4 border-b last:border-0">
              {[1, 2, 3, 4, 5, 6].map((col) => (
                <Skeleton key={col} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
