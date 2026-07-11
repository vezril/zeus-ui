"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import type { Labels } from "@/lib/hermes";
import { uid } from "@/lib/uid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Pair {
  id: string;
  key: string;
  value: string;
}

function toPairs(labels: Labels): Pair[] {
  return Object.entries(labels).map(([key, value]) => ({
    id: uid(),
    key,
    value,
  }));
}

function toLabels(pairs: Pair[]): Labels {
  const out: Labels = {};
  for (const p of pairs) {
    const key = p.key.trim();
    if (key) out[key] = p.value;
  }
  return out;
}

/**
 * A key/value editor for a topic's labels. Seeds from `initial` once and reports
 * the reconstructed label map (empty keys dropped) on every edit.
 */
export function LabelsEditor({
  initial,
  onChange,
}: {
  initial: Labels;
  onChange: (labels: Labels) => void;
}) {
  const [pairs, setPairs] = React.useState<Pair[]>(() => toPairs(initial));

  function update(next: Pair[]) {
    setPairs(next);
    onChange(toLabels(next));
  }

  return (
    <div className="space-y-2">
      {pairs.length === 0 && (
        <p className="text-xs text-muted-foreground">No labels.</p>
      )}
      {pairs.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <Input
            value={p.key}
            placeholder="key"
            spellCheck={false}
            className="h-8 font-mono text-xs"
            onChange={(e) =>
              update(pairs.map((q) => (q.id === p.id ? { ...q, key: e.target.value } : q)))
            }
          />
          <Input
            value={p.value}
            placeholder="value"
            spellCheck={false}
            className="h-8 font-mono text-xs"
            onChange={(e) =>
              update(pairs.map((q) => (q.id === p.id ? { ...q, value: e.target.value } : q)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove label"
            className="size-8 shrink-0"
            onClick={() => update(pairs.filter((q) => q.id !== p.id))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          update([...pairs, { id: uid(), key: "", value: "" }])
        }
      >
        <Plus className="size-4" />
        Add label
      </Button>
    </div>
  );
}
