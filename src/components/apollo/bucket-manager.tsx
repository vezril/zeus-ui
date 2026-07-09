"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  Loader2,
  Trash2,
} from "lucide-react";

import { useInfiniteBuckets } from "@/lib/hooks/use-buckets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateBucketDialog } from "./create-bucket-dialog";
import { DeleteBucketDialog } from "./delete-bucket-dialog";

interface Row {
  name: string;
  /** Optimistically inserted, not yet confirmed in the read model. */
  syncing: boolean;
}

/**
 * Bucket management screen (tasks 3.1–3.3): keyset infinite-scroll list, a
 * create dialog, and a guarded delete dialog. Newly created buckets get the
 * "visible syncing" treatment — optimistically shown with a badge until the
 * eventually-consistent list catches up.
 */
export function BucketManager() {
  const query = useInfiniteBuckets();
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = query;

  const fetched = React.useMemo(
    () => data?.pages.flatMap((p) => p.buckets) ?? [],
    [data]
  );

  // Buckets created this session but not yet visible in the read model.
  const [pending, setPending] = React.useState<string[]>([]);

  // Drop a pending name once it appears in the fetched list.
  React.useEffect(() => {
    if (pending.length === 0) return;
    const present = new Set(fetched);
    setPending((prev) => prev.filter((n) => !present.has(n)));
  }, [fetched, pending.length]);

  // While anything is syncing, keep polling the eventually-consistent list.
  React.useEffect(() => {
    if (pending.length === 0) return;
    const id = setInterval(() => void refetch(), 2000);
    return () => clearInterval(id);
  }, [pending.length, refetch]);

  const rows: Row[] = React.useMemo(() => {
    const present = new Set(fetched);
    const extra = pending.filter((n) => !present.has(n));
    return [
      ...fetched.map((name) => ({ name, syncing: false })),
      ...extra.map((name) => ({ name, syncing: true })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }, [fetched, pending]);

  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  // Sentinel-driven fetch of the next keyset page as it nears the viewport.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Database className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Buckets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Apollo object storage.
            </p>
          </div>
        </div>
        <CreateBucketDialog
          onCreated={(name) =>
            setPending((prev) => (prev.includes(name) ? prev : [...prev, name]))
          }
        />
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>Couldn&apos;t load buckets.</p>
          <p className="text-xs">{(error as Error)?.message}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-sm text-muted-foreground">
          No buckets yet. Create the first one.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map((row) => (
            <li
              key={row.name}
              className="flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <Database className="size-4 shrink-0 text-muted-foreground" />
              <Link
                href={`/apollo/${encodeURIComponent(row.name)}`}
                className="min-w-0 flex-1 truncate font-mono text-sm hover:underline"
              >
                {row.name}
              </Link>
              {row.syncing && (
                <Badge variant="muted" className="shrink-0">
                  <Loader2 className="size-3 animate-spin" />
                  syncing
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${row.name}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={row.syncing}
                onClick={() => setDeleteTarget(row.name)}
              >
                <Trash2 className="size-4" />
              </Button>
              <Link
                href={`/apollo/${encodeURIComponent(row.name)}`}
                aria-label={`Open ${row.name}`}
                className="shrink-0 text-muted-foreground"
              >
                <ChevronRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Sentinel + paging states */}
      <div ref={sentinelRef} />
      <div className="flex justify-center py-6 text-sm text-muted-foreground">
        {isFetchingNextPage ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading more…
          </span>
        ) : !hasNextPage && rows.length > 0 ? (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4" /> End of buckets
          </span>
        ) : null}
      </div>

      <DeleteBucketDialog
        bucket={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={() => refetch()}
      />
    </div>
  );
}
