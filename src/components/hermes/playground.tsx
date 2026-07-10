"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Copy, Radio, Send } from "lucide-react";

import { getHermesClient } from "@/lib/hermes";
import type { Labels, TapMessage } from "@/lib/hermes";
import { TAP_ORIGIN_ATTR } from "@/lib/hermes/types";
import { useTopics } from "@/lib/hooks/use-topics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LabelsEditor } from "./labels-editor";

type FeedItem = TapMessage & { mine: boolean };
type TapStatus = "idle" | "open" | "error" | "closed";

const FEED_CAP = 200;

/**
 * Hermes playground (tasks 3.1–3.3): publish a message to a topic (left) and
 * watch a live feed of messages arriving on a non-destructive inspector tap
 * (right). Publishing your own message scrolls it into the feed, so the
 * "see interactions" loop is visible end to end.
 */
export function Playground() {
  const { data: topics } = useTopics();
  const [topicId, setTopicId] = React.useState("");

  // Default to the scratch topic when present, else the first topic.
  React.useEffect(() => {
    if (topicId || !topics?.length) return;
    setTopicId(
      topics.find((t) => t.topicId === "zeus.playground")?.topicId ??
        topics[0].topicId
    );
  }, [topics, topicId]);

  // A per-view marker so the tap can flag messages this view published as "mine".
  const tapOrigin = React.useRef<string>("");
  if (!tapOrigin.current) tapOrigin.current = crypto.randomUUID();

  // --- Live tap ---
  const [feed, setFeed] = React.useState<FeedItem[]>([]);
  const [tapStatus, setTapStatus] = React.useState<TapStatus>("idle");

  React.useEffect(() => {
    if (!topicId) return;
    setFeed([]);
    setTapStatus("idle");
    const tap = getHermesClient().openTap(topicId);
    tap.onStatus((s) => setTapStatus(s));
    tap.onMessage((m) =>
      setFeed((prev) =>
        [
          { ...m, mine: m.attributes[TAP_ORIGIN_ATTR] === tapOrigin.current },
          ...prev,
        ].slice(0, FEED_CAP)
      )
    );
    return () => tap.close();
  }, [topicId]);

  // --- Side-effect warning: real (non-inspector) subscribers on the topic ---
  const realSubs = useQuery({
    queryKey: ["hermes", "real-subscribers", topicId],
    enabled: !!topicId,
    queryFn: () => getHermesClient().realSubscriberCount(topicId),
  });

  // --- Publish form ---
  const [payload, setPayload] = React.useState("");
  const [attributes, setAttributes] = React.useState<Labels>({});
  const [ttl, setTtl] = React.useState("");
  const [idempotencyKey, setIdempotencyKey] = React.useState("");

  const publish = useMutation({
    mutationFn: () =>
      getHermesClient().publish({
        topicId,
        payload,
        attributes: { ...attributes, [TAP_ORIGIN_ATTR]: tapOrigin.current },
        ttlSeconds: ttl ? Number(ttl) : undefined,
        idempotencyKey: idempotencyKey || undefined,
      }),
  });

  const canPublish = !!topicId && payload.length > 0 && !publish.isPending;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Radio className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish to a topic and watch it flow, live.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Publish */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Publish
          </h2>

          <label className="mb-1 block text-xs text-muted-foreground">Topic</label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="mb-3 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {(topics ?? []).map((t) => (
              <option key={t.topicId} value={t.topicId}>
                {t.topicId}
              </option>
            ))}
          </select>

          {realSubs.data !== undefined && realSubs.data > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                This topic has {realSubs.data} real subscriber
                {realSubs.data === 1 ? "" : "s"} — a published message reaches
                live consumers.
              </span>
            </div>
          )}

          <label className="mb-1 block text-xs text-muted-foreground">
            Payload
          </label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='{"hello":"world"}'
            rows={4}
            spellCheck={false}
            className="mb-3 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
            Attributes
          </p>
          <div className="mb-3">
            <LabelsEditor initial={{}} onChange={setAttributes} />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                TTL (seconds, optional)
              </label>
              <Input
                value={ttl}
                onChange={(e) => setTtl(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="h-8"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Idempotency key (optional)
              </label>
              <Input
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                spellCheck={false}
                className="h-8 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button disabled={!canPublish} onClick={() => publish.mutate()}>
              <Send className="size-4" />
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
            {publish.isSuccess && (
              <span className="text-xs text-muted-foreground">
                {publish.data.deduplicated ? "deduplicated → " : "published "}
                <span className="font-mono">{publish.data.messageId}</span>
              </span>
            )}
            {publish.isError && (
              <span className="text-xs text-destructive">
                {(publish.error as Error).message}
              </span>
            )}
          </div>
        </section>

        {/* Live feed */}
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Live feed
            </h2>
            <TapIndicator status={tapStatus} />
          </div>

          {feed.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Waiting for messages on{" "}
              <span className="font-mono">{topicId || "…"}</span>. Publish one to
              see the loop.
            </div>
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {feed.map((m) => (
                <FeedRow key={m.id} message={m} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function TapIndicator({ status }: { status: TapStatus }) {
  const meta: Record<TapStatus, { label: string; dot: string }> = {
    idle: { label: "connecting", dot: "bg-status-unknown" },
    open: { label: "tapping", dot: "bg-status-serving" },
    error: { label: "reconnecting", dot: "bg-status-not-serving" },
    closed: { label: "stopped", dot: "bg-status-unknown" },
  };
  const m = meta[status];
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", m.dot)} aria-hidden />
      {m.label}
    </span>
  );
}

function FeedRow({ message }: { message: FeedItem }) {
  const attrs = Object.entries(message.attributes).filter(
    ([k]) => k !== TAP_ORIGIN_ATTR
  );
  return (
    <li className="rounded-md border border-border bg-background/40 p-2.5">
      <div className="mb-1 flex items-center gap-2">
        {message.mine && <Badge variant="solid">mine</Badge>}
        {!message.isText && <Badge variant="muted">binary</Badge>}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {message.publishTime}
        </span>
      </div>
      <div className="flex items-start gap-2">
        <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs">
          {message.isText ? message.payload : "⟨binary payload⟩"}
        </pre>
        {message.isText && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy payload"
            className="size-7 shrink-0 text-muted-foreground"
            onClick={() => navigator.clipboard?.writeText(message.payload)}
          >
            <Copy className="size-3.5" />
          </Button>
        )}
      </div>
      {attrs.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {attrs.map(([k, v]) => (
            <Badge key={k} variant="outline" className="text-[10px]">
              {k}={v}
            </Badge>
          ))}
        </div>
      )}
    </li>
  );
}
