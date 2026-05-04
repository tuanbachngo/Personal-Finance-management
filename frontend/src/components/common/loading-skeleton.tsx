export function LoadingSkeleton({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4" role="status" aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded bg-surface-hover" />
      <div className="mt-3 h-32 animate-pulse rounded bg-surface-hover" />
      <p className="mt-3 text-sm text-muted">{label}</p>
    </div>
  );
}

