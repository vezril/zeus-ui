"use client";

import * as React from "react";
import {
  AlertCircle,
  Info,
  RotateCcw,
  Skull,
  Trash2,
} from "lucide-react";

import type { DeadLetter } from "@/lib/hermes";
import {
  useDeadLetters,
  useDiscardDeadLetter,
  useReplayDeadLetter,
} from "@/lib/hooks/use-dlq";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

/** Why a message can't be replayed, or null when it can. */
function replayBlockedReason(m: DeadLetter): string | null {
  if (!m.isText) return "binary payload";
  if (!m.originTopic) return "origin topic unknown";
  return null;
}

/**
 * Hermes dead-letter triage (tasks 3.2–3.3). Browses the configured dead-letter
 * topic through a Zeus inspector subscription and offers per-message Replay
 * (redrive to origin) or Discard. Because reading leases messages, this is a
 * triage working set — not a stable snapshot.
 */
export function DlqManager() {
  const { data, isLoading, isError, error, refetch } = useDeadLetters();
  const replay = useReplayDeadLetter();
  const discard = useDiscardDeadLetter();
  const [discardTarget, setDiscardTarget] = React.useState<DeadLetter | null>(
    null
  );

  async function confirmDiscard() {
    if (!discardTarget) return;
    try {
      await discard.mutateAsync(discardTarget.ackId);
      setDiscardTarget(null);
    } catch {
      // Surfaced in the dialog.
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Skull className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dead-letters</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Triage messages that exhausted their delivery attempts.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>Couldn&apos;t load dead-letters.</p>
          <p className="text-xs">{(error as Error)?.message}</p>
        </div>
      ) : !data?.configured ? (
        <div className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
          <Info className="mx-auto mb-2 size-5" />
          No dead-letter topic is configured.
          <p className="mt-1 text-xs">
            Set <span className="font-mono">HERMES_DLQ_TOPIC</span> to HermesMQ&apos;s
            configured dead-letter topic to triage here.
          </p>
        </div>
      ) : data.messages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
          No dead-letters on{" "}
          <span className="font-mono">{data.dlqTopic}</span>. 🎉
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            Triage view — pulled messages are leased from{" "}
            <span className="font-mono">{data.dlqTopic}</span>; replay or discard
            each. Un-acted messages return after the ack deadline.
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>

          <ul className="space-y-2">
            {data.messages.map((m) => {
              const blocked = replayBlockedReason(m);
              return (
                <li
                  key={m.ackId}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">
                      from {m.sourceSubscription || "?"}
                    </Badge>
                    <Badge variant="muted">{m.deliveryAttempts} attempts</Badge>
                    {m.originTopic ? (
                      <Badge variant="outline">→ {m.originTopic}</Badge>
                    ) : (
                      <Badge variant="muted">origin unknown</Badge>
                    )}
                    {!m.isText && <Badge variant="muted">binary</Badge>}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {m.publishTime}
                    </span>
                  </div>

                  <pre className="mb-3 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background/40 p-2 font-mono text-xs">
                    {m.isText ? m.payload : "⟨binary payload⟩"}
                  </pre>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!!blocked || replay.isPending}
                      title={blocked ? `Can't replay: ${blocked}` : undefined}
                      onClick={() => replay.mutate(m)}
                    >
                      <RotateCcw className="size-4" />
                      Replay
                    </Button>
                    {blocked && (
                      <span className="text-xs text-muted-foreground">
                        can&apos;t replay — {blocked}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => setDiscardTarget(m)}
                    >
                      <Trash2 className="size-4" />
                      Discard
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Dialog
        open={discardTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDiscardTarget(null);
            discard.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              Discard dead-letter
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Discard this dead-lettered message from{" "}
              <span className="font-mono">
                {discardTarget?.sourceSubscription}
              </span>
              ? It will be removed without republishing.
            </p>
            {discard.isError && (
              <p className="text-xs text-destructive">
                {(discard.error as Error).message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiscardTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={discard.isPending}
              onClick={confirmDiscard}
            >
              {discard.isPending ? "Discarding…" : "Discard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
