"use client";

import * as React from "react";
import { AlertCircle, Loader2, Send, Tag, Trash2 } from "lucide-react";

import { useDeleteTopic, useTopics } from "@/lib/hooks/use-topics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CreateTopicDialog } from "./create-topic-dialog";
import { EditLabelsDialog } from "./edit-labels-dialog";
import { DeleteTopicDialog } from "./delete-topic-dialog";

/** Compact count: 1234 → 1.2k, 1200000 → 1.2M. */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface Row {
  topicId: string;
  publishedTotal: number;
  syncing: boolean;
  deleting: boolean;
}

/**
 * Hermes topics admin screen (tasks 3.1–3.4 + 5.2 syncing). The topic listing
 * is HermesMQ's stats projection (`GET /v1/topics`) — eventually consistent — so
 * a created topic is shown optimistically with a "syncing" badge and a deleted
 * one with a "deleting" badge until the projection catches up.
 */
export function TopicManager() {
  const { data, isLoading, isError, error, refetch } = useTopics();
  const del = useDeleteTopic();
  const [editTarget, setEditTarget] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = React.useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = React.useState<string[]>([]);

  const listed = data ?? [];
  const listedIds = React.useMemo(
    () => new Set(listed.map((t) => t.topicId)),
    [listed]
  );

  // Reconcile optimistic sets against the eventually-consistent stats list.
  React.useEffect(() => {
    if (pendingCreate.length) {
      setPendingCreate((prev) => prev.filter((id) => !listedIds.has(id)));
    }
    if (pendingDelete.length) {
      setPendingDelete((prev) => prev.filter((id) => listedIds.has(id)));
    }
  }, [listedIds, pendingCreate.length, pendingDelete.length]);

  // Poll the projection while anything is settling.
  React.useEffect(() => {
    if (pendingCreate.length === 0 && pendingDelete.length === 0) return;
    const timer = setInterval(() => void refetch(), 1500);
    return () => clearInterval(timer);
  }, [pendingCreate.length, pendingDelete.length, refetch]);

  const rows: Row[] = React.useMemo(() => {
    const base: Row[] = listed.map((t) => ({
      topicId: t.topicId,
      publishedTotal: t.publishedTotal,
      syncing: false,
      deleting: pendingDelete.includes(t.topicId),
    }));
    const extra: Row[] = pendingCreate
      .filter((id) => !listedIds.has(id))
      .map((id) => ({
        topicId: id,
        publishedTotal: 0,
        syncing: true,
        deleting: false,
      }));
    return [...base, ...extra].sort((a, b) =>
      a.topicId.localeCompare(b.topicId)
    );
  }, [listed, listedIds, pendingCreate, pendingDelete]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    try {
      await del.mutateAsync(id);
      setPendingDelete((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setDeleteTarget(null);
    } catch {
      // Surfaced in the dialog.
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Send className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              HermesMQ pub/sub topics.
            </p>
          </div>
        </div>
        <CreateTopicDialog
          onCreated={(id) =>
            setPendingCreate((prev) => (prev.includes(id) ? prev : [...prev, id]))
          }
        />
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>Couldn&apos;t load topics.</p>
          <p className="text-xs">{(error as Error)?.message}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-sm text-muted-foreground">
          No topics yet. Create the first one.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map((t) => {
            const busy = t.syncing || t.deleting;
            return (
              <li
                key={t.topicId}
                className={cn(
                  "flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-accent/40",
                  t.deleting && "opacity-50"
                )}
              >
                <Send className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm">
                  {t.topicId}
                </span>
                {t.syncing ? (
                  <Badge variant="muted" className="shrink-0">
                    <Loader2 className="size-3 animate-spin" />
                    syncing
                  </Badge>
                ) : t.deleting ? (
                  <Badge variant="muted" className="shrink-0">
                    <Loader2 className="size-3 animate-spin" />
                    deleting
                  </Badge>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatCount(t.publishedTotal)} published
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit labels for ${t.topicId}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  disabled={busy}
                  onClick={() => setEditTarget(t.topicId)}
                >
                  <Tag className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${t.topicId}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => setDeleteTarget(t.topicId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <EditLabelsDialog
        topicId={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <DeleteTopicDialog
        topicId={deleteTarget}
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
    </div>
  );
}
