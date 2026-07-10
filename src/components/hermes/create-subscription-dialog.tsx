"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { validateHermesId } from "@/lib/hermes/validation";
import { useCreateSubscription } from "@/lib/hooks/use-subscriptions";
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

/**
 * Create-subscription dialog (task 3.3). Binds a validated subscription id to a
 * topic id (both mirror HermesMQ's id rules), surfacing 409/400 as the backstop.
 * Reports the new id so the list can show it with the syncing treatment.
 */
export function CreateSubscriptionDialog({
  onCreated,
}: {
  onCreated?: (subscriptionId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [subscriptionId, setSubscriptionId] = React.useState("");
  const [topicId, setTopicId] = React.useState("");
  const create = useCreateSubscription();

  const subError = subscriptionId
    ? validateHermesId(subscriptionId, "Subscription id")
    : null;
  const topicError = topicId ? validateHermesId(topicId, "Topic id") : null;
  const canSubmit =
    subscriptionId.length > 0 &&
    topicId.length > 0 &&
    !subError &&
    !topicError &&
    !create.isPending;

  function reset() {
    setSubscriptionId("");
    setTopicId("");
    create.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await create.mutateAsync({ subscriptionId, topicId });
      onCreated?.(subscriptionId);
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
          New subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New subscription</DialogTitle>
            <DialogDescription>
              Bind a subscription to a topic. Ids are non-blank and must not
              contain the reserved separator &apos;~&apos;.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="sub-id"
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Subscription id
              </label>
              <Input
                id="sub-id"
                autoFocus
                value={subscriptionId}
                onChange={(e) => setSubscriptionId(e.target.value)}
                placeholder="orders.fulfillment"
                aria-invalid={!!subError}
                spellCheck={false}
                className="font-mono"
              />
              {subError && (
                <p className="text-xs text-destructive">{subError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="sub-topic"
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Topic id
              </label>
              <Input
                id="sub-topic"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                placeholder="orders.events"
                aria-invalid={!!topicError}
                spellCheck={false}
                className="font-mono"
              />
              {topicError && (
                <p className="text-xs text-destructive">{topicError}</p>
              )}
            </div>

            {create.isError && (
              <p className="text-xs text-destructive">
                {(create.error as Error).message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {create.isPending ? "Creating…" : "Create subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
