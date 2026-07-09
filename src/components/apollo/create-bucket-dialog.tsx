"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { validateBucketName } from "@/lib/apollo/validation";
import { useCreateBucket } from "@/lib/hooks/use-buckets";
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
 * Create-bucket dialog (task 3.2). Validates the name client-side as the
 * operator types (Apollo's rules, for instant feedback) and surfaces Apollo's
 * INVALID_ARGUMENT/ALREADY_EXISTS as the server backstop. On success it reports
 * the new name so the list can show it with the syncing treatment.
 */
export function CreateBucketDialog({
  onCreated,
}: {
  onCreated: (name: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const create = useCreateBucket();

  const validationError = name ? validateBucketName(name) : null;
  const canSubmit = name.length > 0 && !validationError && !create.isPending;

  function reset() {
    setName("");
    create.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await create.mutateAsync(name);
      onCreated(name);
      setOpen(false);
      reset();
    } catch {
      // Error is surfaced from create.error below; keep the dialog open.
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
          New bucket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New bucket</DialogTitle>
            <DialogDescription>
              3–63 characters, lowercase letters, digits, and hyphens; must start
              and end with a letter or digit.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.trim())}
              placeholder="my-bucket-name"
              aria-invalid={!!validationError}
              spellCheck={false}
            />
            {validationError ? (
              <p className="text-xs text-destructive">{validationError}</p>
            ) : create.isError ? (
              <p className="text-xs text-destructive">
                {(create.error as Error).message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {create.isPending ? "Creating…" : "Create bucket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
