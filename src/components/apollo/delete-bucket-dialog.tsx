"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import {
  useBucketObjectCount,
  useDeleteBucket,
} from "@/lib/hooks/use-buckets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Delete-bucket confirmation (task 3.3). Because Apollo does not require an empty
 * bucket and does not cascade-delete blobs, deletion can orphan objects — so the
 * modal shows the current object count and an orphan warning, and the Delete
 * button stays disabled until the operator types the bucket name exactly.
 */
export function DeleteBucketDialog({
  bucket,
  onOpenChange,
  onDeleted,
}: {
  /** The bucket to delete, or null when the dialog is closed. */
  bucket: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (name: string) => void;
}) {
  const open = bucket !== null;
  const [confirm, setConfirm] = React.useState("");
  const del = useDeleteBucket();
  const countQuery = useBucketObjectCount(bucket ?? "", open);

  // Reset the typed confirmation whenever the target changes.
  React.useEffect(() => {
    setConfirm("");
    del.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  const matches = confirm === bucket;

  async function handleDelete() {
    if (!bucket || !matches) return;
    try {
      await del.mutateAsync(bucket);
      onDeleted(bucket);
      onOpenChange(false);
    } catch {
      // Surfaced from del.error below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete bucket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            You are about to delete{" "}
            <span className="font-mono font-medium text-foreground">
              {bucket}
            </span>
            .
          </p>

          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
            <p className="font-medium">This does not delete its contents.</p>
            <p className="mt-1 text-destructive/90">
              Apollo does not empty-check buckets or cascade-delete blobs, so any
              objects{" "}
              {countQuery.isLoading
                ? "in this bucket"
                : countQuery.data
                  ? `(${countQuery.data.atLeast ? "at least " : ""}${countQuery.data.count})`
                  : "in this bucket"}{" "}
              become orphaned.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-bucket" className="text-muted-foreground">
              Type <span className="font-mono text-foreground">{bucket}</span> to
              confirm:
            </label>
            <Input
              id="confirm-bucket"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {del.isError && (
            <p className="text-xs text-destructive">
              {(del.error as Error).message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!matches || del.isPending}
            onClick={handleDelete}
          >
            {del.isPending ? "Deleting…" : "Delete bucket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
