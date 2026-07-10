"use client";

import * as React from "react";

import type { Labels } from "@/lib/hermes";
import { useTopic, useUpdateLabels } from "@/lib/hooks/use-topics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LabelsEditor } from "./labels-editor";

/**
 * Edit-labels dialog (task 3.3). Fetches the topic's current labels on open
 * (the listing carries none) and persists the full edited map via
 * PATCH /v1/topics/{id}, which replaces the label set.
 */
export function EditLabelsDialog({
  topicId,
  onOpenChange,
}: {
  topicId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = topicId !== null;
  const topic = useTopic(topicId, open);
  const update = useUpdateLabels();
  const [labels, setLabels] = React.useState<Labels>({});

  async function handleSave() {
    if (!topicId) return;
    try {
      await update.mutateAsync({ topicId, labels });
      onOpenChange(false);
    } catch {
      // Surfaced below.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) update.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="break-all font-mono">{topicId}</DialogTitle>
        </DialogHeader>

        <div className="my-2 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Labels
          </p>
          {topic.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : topic.isError ? (
            <p className="text-sm text-destructive">
              {(topic.error as Error).message}
            </p>
          ) : topic.data ? (
            // Key by topic id so the editor re-seeds when the target changes.
            <LabelsEditor
              key={topicId}
              initial={topic.data.labels}
              onChange={setLabels}
            />
          ) : null}
          {update.isError && (
            <p className="text-xs text-destructive">
              {(update.error as Error).message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending || topic.isLoading || !topic.data}
            onClick={handleSave}
          >
            {update.isPending ? "Saving…" : "Save labels"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
