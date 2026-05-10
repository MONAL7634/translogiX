export default async function TrackPage({
  params,
}: {
  params: Promise<{ packageCode: string }>;
}) {
  const { packageCode } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Track Shipment</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your package code to track your shipment
          </p>
        </div>
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <p className="text-center text-muted-foreground">
            Tracking for package: <span className="font-mono font-medium">{packageCode}</span>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Tracking UI will be implemented in the tracking-system feature.
          </p>
        </div>
      </div>
    </div>
  );
}
