import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Track Shipment | TransLogiX",
  description: "Track your shipment status in real-time",
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/10">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <Link href="/track" className="text-lg font-semibold tracking-tight">
            TransLogiX
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
