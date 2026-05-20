"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, RefreshCw, Shield, Truck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserRole = "ADMIN" | "TRANSPORTER" | "DRIVER" | "CUSTOMER";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  transporterId: string | null;
  transporterName: string | null;
  emailVerified: boolean;
  createdAt: string;
  sessionCount: number;
}

interface Transporter {
  id: string;
  name: string;
  status: string;
}

const roleTone: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  TRANSPORTER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DRIVER: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  CUSTOMER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/admin/users", { credentials: "include" });
        if (!response.ok) throw new Error(`Failed to load users (${response.status})`);
        const data = await response.json();
        if (!cancelled) {
          setUsers(data.users ?? []);
          setTransporters(data.transporters ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load users");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const counts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        acc[user.role] += 1;
        return acc;
      },
      { ADMIN: 0, TRANSPORTER: 0, DRIVER: 0, CUSTOMER: 0 } as Record<UserRole, number>
    );
  }, [users]);

  async function updateUser(user: ManagedUser, patch: Partial<Pick<ManagedUser, "role" | "transporterId">>) {
    setSavingId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to update user");
      }
      toast.success("User updated");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)} className="gap-2">
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
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="mt-1 text-muted-foreground">
          Assign roles and link transporter or driver accounts to transporter records.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Admins" value={counts.ADMIN} icon={Shield} />
        <Metric title="Transporters" value={counts.TRANSPORTER} icon={Truck} />
        <Metric title="Drivers" value={counts.DRIVER} icon={UserCog} />
        <Metric title="Customers" value={counts.CUSTOMER} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Transporter Link</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const needsTransporter = user.role === "TRANSPORTER" || user.role === "DRIVER";
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(role) => updateUser(user, { role: role as UserRole })}
                        disabled={savingId === user.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["ADMIN", "TRANSPORTER", "DRIVER", "CUSTOMER"] as UserRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              <Badge className={roleTone[role]}>{role}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {needsTransporter ? (
                        <Select
                          value={user.transporterId ?? "none"}
                          onValueChange={(value) =>
                            updateUser(user, { transporterId: value === "none" ? null : value })
                          }
                          disabled={savingId === user.id}
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No transporter linked</SelectItem>
                            {transporters.map((transporter) => (
                              <SelectItem key={transporter.id} value={transporter.id}>
                                {transporter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not required</span>
                      )}
                    </TableCell>
                    <TableCell>{user.sessionCount}</TableCell>
                    <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Shield;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
