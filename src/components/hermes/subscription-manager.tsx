"use client";

import * as React from "react";
import { AlertCircle, Loader2, Waypoints } from "lucide-react";

import type { Subscription } from "@/lib/hermes";
import { useSubscriptions } from "@/lib/hooks/use-subscriptions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CreateSubscriptionDialog } from "./create-subscription-dialog";

/** Compact count: 1234 → 1.2k, 1200000 → 1.2M. */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Humanize an age in seconds: 0s, 45s, 12m, 3h, 2d. */
function formatAge(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

interface Row extends Subscription {
  syncing: boolean;
}

/** A labelled metric cell (never color-only — always a number + label). */
function Metric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-col items-end">
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          emphasize ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * Hermes subscriptions operator view (tasks 3.2–3.3). Lists each subscription
 * with its topic and queue health — backlog (depth), oldest-unacked age,
 * redelivered, and dead-lettered (emphasized when > 0). The listing is an
 * eventually-consistent stats projection, so a created subscription is shown
 * optimistically with a "syncing" badge until it appears.
 */
export function SubscriptionManager() {
  const { data, isLoading, isError, error, refetch } = useSubscriptions();
  const [pendingCreate, setPendingCreate] = React.useState<string[]>([]);

  const listed = React.useMemo(() => data ?? [], [data]);
  const listedIds = React.useMemo(
    () => new Set(listed.map((s) => s.subscriptionId)),
    [listed]
  );

  React.useEffect(() => {
    if (pendingCreate.length) {
      setPendingCreate((prev) => prev.filter((id) => !listedIds.has(id)));
    }
  }, [listedIds, pendingCreate.length]);

  React.useEffect(() => {
    if (pendingCreate.length === 0) return;
    const timer = setInterval(() => void refetch(), 1500);
    return () => clearInterval(timer);
  }, [pendingCreate.length, refetch]);

  const rows: Row[] = React.useMemo(() => {
    const base: Row[] = listed.map((s) => ({ ...s, syncing: false }));
    const extra: Row[] = pendingCreate
      .filter((id) => !listedIds.has(id))
      .map((id) => ({
        subscriptionId: id,
        topicId: "…",
        backlog: 0,
        oldestUnackedAgeSeconds: 0,
        redeliveredTotal: 0,
        deadLetteredTotal: 0,
        syncing: true,
      }));
    return [...base, ...extra].sort((a, b) =>
      a.subscriptionId.localeCompare(b.subscriptionId)
    );
  }, [listed, listedIds, pendingCreate]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Waypoints className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Subscriptions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Queue health across HermesMQ subscriptions.
            </p>
          </div>
        </div>
        <CreateSubscriptionDialog
          onCreated={(id) =>
            setPendingCreate((prev) =>
              prev.includes(id) ? prev : [...prev, id]
            )
          }
        />
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>Couldn&apos;t load subscriptions.</p>
          <p className="text-xs">{(error as Error)?.message}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-sm text-muted-foreground">
          No subscriptions yet. Create the first one.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map((s) => (
            <li
              key={s.subscriptionId}
              className="flex items-center gap-4 bg-card px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <Waypoints className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">
                  {s.subscriptionId}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  → {s.topicId}
                </div>
              </div>
              {s.syncing ? (
                <Badge variant="muted" className="shrink-0">
                  <Loader2 className="size-3 animate-spin" />
                  syncing
                </Badge>
              ) : (
                <div className="flex shrink-0 items-center gap-5">
                  <Metric label="depth" value={formatCount(s.backlog)} />
                  <Metric
                    label="oldest"
                    value={formatAge(s.oldestUnackedAgeSeconds)}
                  />
                  <Metric
                    label="redeliv"
                    value={formatCount(s.redeliveredTotal)}
                  />
                  <Metric
                    label="dead-letter"
                    value={formatCount(s.deadLetteredTotal)}
                    emphasize={s.deadLetteredTotal > 0}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
