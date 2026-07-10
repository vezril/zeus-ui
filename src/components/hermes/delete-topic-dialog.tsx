"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Delete-topic confirmation (task 3.4). A simple confirm — a topic delete is
 * single-item; the row leaves the listing once the delete succeeds.
 */
export function DeleteTopicDialog({
  topicId,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: {
  topicId: string | null;
  isDeleting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const open = topicId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete topic
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p>
            Delete{" "}
            <span className="font-mono font-medium text-foreground">
              {topicId}
            </span>
            ? This cannot be undone.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? "Deleting…" : "Delete topic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
