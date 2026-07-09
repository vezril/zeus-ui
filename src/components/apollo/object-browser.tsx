"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  File as FileIcon,
  Folder,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import type { ObjectEntry } from "@/lib/apollo";
import { formatBytes } from "@/lib/format";
import { useInfiniteObjects, useDeleteObject } from "@/lib/hooks/use-objects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ObjectMetadataDrawer } from "./object-metadata-drawer";
import { DeleteObjectDialog } from "./delete-object-dialog";
import { UploadDialog } from "./upload-dialog";

interface FileRow {
  key: string;
  size: string | null;
  deleting: boolean;
  syncing: boolean;
}

/**
 * Object browser (tasks 4.1–4.4 + 5.3 syncing). Lists a bucket's objects under
 * the current prefix (keyset paged), deriving S3-style "folders" from the next
 * key segment. Clicking a file opens the HeadObject metadata drawer; deletion
 * goes behind a confirmation modal; and newly uploaded objects appear
 * immediately with a "syncing" badge until the read model catches up.
 */
export function ObjectBrowser({ bucket }: { bucket: string }) {
  const [prefix, setPrefix] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string[]>([]);

  const query = useInfiniteObjects(bucket, prefix);
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
  const del = useDeleteObject(bucket);

  const objects = React.useMemo(
    () => data?.pages.flatMap((p) => p.objects) ?? [],
    [data]
  );

  // Derive the immediate sub-folders + leaf files relative to the prefix.
  const { folders, files } = React.useMemo(() => {
    const folderSet = new Set<string>();
    const leaves: ObjectEntry[] = [];
    for (const o of objects) {
      const rest = o.object.slice(prefix.length);
      const slash = rest.indexOf("/");
      if (slash === -1) leaves.push(o);
      else folderSet.add(prefix + rest.slice(0, slash + 1));
    }
    return {
      folders: [...folderSet].sort(),
      files: leaves,
    };
  }, [objects, prefix]);

  const fetchedKeys = React.useMemo(
    () => new Set(objects.map((o) => o.object)),
    [objects]
  );

  // Merge fetched leaves with still-syncing uploaded keys at this prefix level.
  const fileRows: FileRow[] = React.useMemo(() => {
    const rows: FileRow[] = files.map((o) => ({
      key: o.object,
      size: o.size,
      deleting: deleting.includes(o.object),
      syncing: false,
    }));
    for (const key of pending) {
      if (
        key.startsWith(prefix) &&
        !key.slice(prefix.length).includes("/") &&
        !fetchedKeys.has(key)
      ) {
        rows.push({ key, size: null, deleting: false, syncing: true });
      }
    }
    return rows.sort((a, b) => a.key.localeCompare(b.key));
  }, [files, pending, prefix, deleting, fetchedKeys]);

  // Drop pending/deleting keys once the listing reflects them, and poll the
  // eventually-consistent read model while either is outstanding.
  React.useEffect(() => {
    if (pending.length) {
      setPending((prev) => prev.filter((k) => !fetchedKeys.has(k)));
    }
    if (deleting.length) {
      setDeleting((prev) => prev.filter((k) => fetchedKeys.has(k)));
    }
  }, [fetchedKeys, pending.length, deleting.length]);

  React.useEffect(() => {
    if (pending.length === 0 && deleting.length === 0) return;
    const id = setInterval(() => void refetch(), 2000);
    return () => clearInterval(id);
  }, [pending.length, deleting.length, refetch]);

  // Sentinel-driven keyset paging.
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    const key = deleteTarget;
    try {
      await del.mutateAsync(key);
      setDeleting((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setDeleteTarget(null);
      if (selected === key) setSelected(null);
    } catch {
      // Surfaced in the dialog.
    }
  }

  const segments = prefix ? prefix.split("/").filter(Boolean) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/apollo"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Buckets
      </Link>

      <div className="mb-5 flex items-center justify-between gap-3">
        {/* Breadcrumb */}
        <nav
          className="flex flex-wrap items-center gap-1 text-sm"
          aria-label="Prefix"
        >
          <button
            onClick={() => setPrefix("")}
            className={cn(
              "font-mono font-medium",
              prefix ? "text-primary hover:underline" : "text-foreground"
            )}
          >
            {bucket}
          </button>
          {segments.map((seg, i) => {
            const to = segments.slice(0, i + 1).join("/") + "/";
            const isLast = i === segments.length - 1;
            return (
              <React.Fragment key={to}>
                <span className="text-muted-foreground/50">/</span>
                <button
                  onClick={() => setPrefix(to)}
                  className={cn(
                    "font-mono",
                    isLast ? "text-foreground" : "text-primary hover:underline"
                  )}
                >
                  {seg}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <Button size="sm" className="shrink-0" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>Couldn&apos;t load objects.</p>
          <p className="text-xs">{(error as Error)?.message}</p>
        </div>
      ) : folders.length === 0 && fileRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-sm text-muted-foreground">
          Nothing here yet. Upload the first object.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {folders.map((folder) => (
            <li key={folder}>
              <button
                onClick={() => setPrefix(folder)}
                className="flex w-full items-center gap-3 bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <Folder className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm">
                  {folder.slice(prefix.length).replace(/\/$/, "")}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}

          {fileRows.map((row) => {
            const busy = row.deleting || row.syncing;
            return (
              <li
                key={row.key}
                className={cn(
                  "flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-accent/40",
                  row.deleting && "opacity-50"
                )}
              >
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <button
                  onClick={() => setSelected(row.key)}
                  disabled={busy}
                  className="min-w-0 flex-1 truncate text-left font-mono text-sm hover:underline disabled:no-underline"
                >
                  {row.key.slice(prefix.length)}
                </button>
                {row.syncing ? (
                  <Badge variant="muted" className="shrink-0">
                    <Loader2 className="size-3 animate-spin" />
                    syncing
                  </Badge>
                ) : row.deleting ? (
                  <Badge variant="muted" className="shrink-0">
                    <Loader2 className="size-3 animate-spin" />
                    deleting
                  </Badge>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(row.size ?? "0")}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${row.key}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => setDeleteTarget(row.key)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} />
      <div className="flex justify-center py-6 text-sm text-muted-foreground">
        {isFetchingNextPage ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading more…
          </span>
        ) : !hasNextPage && fileRows.length + folders.length > 0 ? (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4" /> End of listing
          </span>
        ) : null}
      </div>

      <ObjectMetadataDrawer
        bucket={bucket}
        object={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onDelete={(object) => setDeleteTarget(object)}
      />

      <DeleteObjectDialog
        object={deleteTarget}
        isDeleting={del.isPending}
        error={del.isError ? (del.error as Error).message : null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            del.reset();
          }
        }}
        onConfirm={confirmDelete}
      />

      <UploadDialog
        bucket={bucket}
        prefix={prefix}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(key) => {
          setPending((prev) => (prev.includes(key) ? prev : [...prev, key]));
          void refetch();
        }}
      />
    </div>
  );
}
