"use client";

import { Menu, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onMenuClick: () => void;
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

const pageTitles: Array<{ prefix: string; title: string }> = [
  { prefix: "/admin/ai-ops", title: "AI Operations" },
  { prefix: "/admin/reports", title: "Reports" },
  { prefix: "/admin/users", title: "User Management" },
  { prefix: "/admin/settings", title: "Settings" },
  { prefix: "/admin/transporters", title: "Transporters" },
  { prefix: "/admin/vehicles", title: "Vehicles" },
  { prefix: "/admin/routes", title: "Routes" },
  { prefix: "/admin/shipments", title: "Shipments" },
  { prefix: "/admin", title: "Admin Dashboard" },
  { prefix: "/transporter/vehicles", title: "Transporter Vehicles" },
  { prefix: "/transporter/shipments", title: "Transporter Shipments" },
  { prefix: "/transporter", title: "Transporter Dashboard" },
  { prefix: "/driver/shipments", title: "My Shipments" },
  { prefix: "/driver", title: "Driver Dashboard" },
  { prefix: "/customer/track", title: "Track Shipment" },
  { prefix: "/customer", title: "Customer Dashboard" },
];

export function Header({ onMenuClick, user }: HeaderProps) {
  const pathname = usePathname();
  const title =
    pageTitles.find((item) => pathname.startsWith(item.prefix))?.title ??
    "Dashboard";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-muted-foreground">
          {title}
        </p>
      </div>
      {user && (
        <div className="flex min-w-0 items-center gap-2">
          <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium leading-none">{user.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            {user.role}
          </Badge>
        </div>
      )}
    </header>
  );
}
