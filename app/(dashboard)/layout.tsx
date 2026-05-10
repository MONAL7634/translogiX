"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSession() {
      try {
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
        setUser(data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
        <Sidebar
          userRole={user.role as "ADMIN" | "TRANSPORTER" | "DRIVER" | "CUSTOMER"}
          userName={user.name}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar
            userRole={user.role as "ADMIN" | "TRANSPORTER" | "DRIVER" | "CUSTOMER"}
            userName={user.name}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
