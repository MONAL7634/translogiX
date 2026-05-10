"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Route,
  Package,
  BarChart3,
  Users,
  Settings,
  MapPin,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type UserRole = "ADMIN" | "TRANSPORTER" | "DRIVER" | "CUSTOMER";

const roleNavItems: Record<UserRole, { title: string; href: string; icon: typeof LayoutDashboard }[]> = {
  ADMIN: [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Transporters", href: "/admin/transporters", icon: Truck },
    { title: "Vehicles", href: "/admin/vehicles", icon: Truck },
    { title: "Routes", href: "/admin/routes", icon: Route },
    { title: "Shipments", href: "/admin/shipments", icon: Package },
    { title: "Reports", href: "/admin/reports", icon: BarChart3 },
    { title: "User Management", href: "/admin/users", icon: Users },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ],
  TRANSPORTER: [
    { title: "Dashboard", href: "/transporter", icon: LayoutDashboard },
    { title: "Vehicles", href: "/transporter/vehicles", icon: Truck },
    { title: "Shipments", href: "/transporter/shipments", icon: Package },
  ],
  DRIVER: [
    { title: "Dashboard", href: "/driver", icon: LayoutDashboard },
    { title: "My Shipments", href: "/driver/shipments", icon: Package },
  ],
  CUSTOMER: [
    { title: "Dashboard", href: "/customer", icon: LayoutDashboard },
    { title: "Track Shipment", href: "/customer/track", icon: MapPin },
  ],
};

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
}

export function Sidebar({ userRole = "ADMIN", userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = roleNavItems[userRole] || roleNavItems.ADMIN;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      // Clear the session cookie explicitly as fallback
      document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch {
      // Continue with logout even if API call fails
      document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <MapPin className="h-5 w-5" />
          <span>TransLogiX</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== `/${userRole?.toLowerCase()}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        {userName && (
          <div className="mb-2 truncate text-sm text-muted-foreground">
            {userName}
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm font-medium"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
