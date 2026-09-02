import { Skeleton } from "@/components/ui/skeleton";

export function MapSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-6 gap-px opacity-60">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="h-full w-full rounded-none" />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="size-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="text-xs font-medium text-muted-foreground">Loading Chennai map…</p>
      </div>
    </div>
  );
}
