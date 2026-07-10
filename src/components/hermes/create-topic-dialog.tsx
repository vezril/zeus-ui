"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import type { Labels } from "@/lib/hermes";
import { validateTopicId } from "@/lib/hermes/validation";
import { useCreateTopic } from "@/lib/hooks/use-topics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LabelsEditor } from "./labels-editor";

/**
 * Create-topic dialog (task 3.2). Validates the topic id client-side (HermesMQ's
 * rules) with a live message and an optional labels editor, surfacing HermesMQ's
 * 409/400 as the server backstop.
 */
export function CreateTopicDialog({
  onCreated,
}: {
  onCreated?: (topicId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [topicId, setTopicId] = React.useState("");
  const [labels, setLabels] = React.useState<Labels>({});
  const create = useCreateTopic();

  const validationError = topicId ? validateTopicId(topicId) : null;
  const canSubmit = topicId.length > 0 && !validationError && !create.isPending;

  function reset() {
    setTopicId("");
    setLabels({});
    create.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await create.mutateAsync({ topicId, labels });
      onCreated?.(topicId);
      setOpen(false);
      reset();
    } catch {
      // Surfaced from create.error below.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New topic
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New topic</DialogTitle>
            <DialogDescription>
              A non-blank id that doesn&apos;t contain the reserved separator
              &apos;~&apos;. Labels are optional.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="space-y-2">
              <Input
                autoFocus
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                placeholder="orders.events"
                aria-invalid={!!validationError}
                spellCheck={false}
                className="font-mono"
              />
              {validationError ? (
                <p className="text-xs text-destructive">{validationError}</p>
              ) : create.isError ? (
                <p className="text-xs text-destructive">
                  {(create.error as Error).message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Labels
              </p>
              <LabelsEditor initial={{}} onChange={setLabels} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {create.isPending ? "Creating…" : "Create topic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
