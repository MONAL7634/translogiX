"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerTrackPage() {
  const [packageCode, setPackageCode] = useState("");
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = packageCode.trim();
    if (!code) return;
    router.push(`/track/${encodeURIComponent(code)}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Track Shipment</h1>
        <p className="mt-1 text-muted-foreground">
          Search by package code to open the live tracking timeline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Package Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="packageCode">Shipment package code</Label>
              <Input
                id="packageCode"
                value={packageCode}
                onChange={(event) => setPackageCode(event.target.value)}
                placeholder="e.g. PKG-001"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={!packageCode.trim()} className="gap-2">
              Track
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
