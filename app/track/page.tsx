"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package } from "lucide-react";

export default function TrackPage() {
  const router = useRouter();
  const [packageCode, setPackageCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = packageCode.trim();
    if (trimmed) {
      router.push(`/track/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <Package className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Track Your Shipment
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your package code to view the latest status and tracking history.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
        <Input
          type="text"
          placeholder="e.g. PKG-001"
          value={packageCode}
          onChange={(e) => setPackageCode(e.target.value)}
          className="flex-1"
          aria-label="Package code"
        />
        <Button type="submit" disabled={!packageCode.trim()}>
          <Search className="mr-1.5 h-4 w-4" />
          Track
        </Button>
      </form>
    </div>
  );
}
