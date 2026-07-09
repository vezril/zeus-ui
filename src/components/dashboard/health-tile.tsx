import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import type { HealthStatus } from "@/lib/apollo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Tile state: a live health result, still loading, or an un-built module. */
export type TileState =
  | { kind: "health"; status: HealthStatus }
  | { kind: "loading" }
  | { kind: "coming-soon" };

const STATUS_META: Record<
  HealthStatus,
  { label: string; dot: string; text: string }
> = {
  SERVING: {
    label: "Serving",
    dot: "bg-status-serving",
    text: "text-status-serving",
  },
  NOT_SERVING: {
    label: "Not serving",
    dot: "bg-status-not-serving",
    text: "text-status-not-serving",
  },
  UNKNOWN: {
    label: "Unknown",
    dot: "bg-status-unknown",
    text: "text-status-unknown",
  },
};

function StatusLine({ state }: { state: TileState }) {
  if (state.kind === "loading") {
    return <Skeleton className="h-4 w-24" />;
  }
  if (state.kind === "coming-soon") {
    return <Badge variant="muted">Coming soon</Badge>;
  }
  const meta = STATUS_META[state.status];
  return (
    <span className="flex items-center gap-2 text-sm">
      {/* Status is never color-only — always paired with the text label. */}
      <span className={cn("size-2.5 rounded-full", meta.dot)} aria-hidden />
      <span className={meta.text}>{meta.label}</span>
    </span>
  );
}

export function HealthTile({
  name,
  blurb,
  icon: Icon,
  href,
  state,
}: {
  name: string;
  blurb: string;
  icon: LucideIcon;
  href?: string;
  state: TileState;
}) {
  const disabled = !href;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "size-5",
              disabled ? "text-muted-foreground/60" : "text-primary"
            )}
          />
          <h3 className="font-semibold tracking-tight">{name}</h3>
        </div>
        {href && (
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
      <div className="mt-4">
        <StatusLine state={state} />
      </div>
    </>
  );

  const base =
    "block rounded-lg border border-border bg-card p-4 text-left transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(base, "group hover:border-ring/60")}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={cn(base, "opacity-70")} aria-disabled="true">
      {inner}
    </div>
  );
}
