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
 * Delete-object confirmation (task 4.4). A simple confirm (not type-to-confirm
 * like buckets) — object deletion is single-item and reversible-by-reupload, so
 * an explicit confirmation modal is the guardrail. The row leaves the listing
 * once the deletion propagates through the read model (handled by the caller).
 */
export function DeleteObjectDialog({
  object,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: {
  object: string | null;
  isDeleting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const open = object !== null;
  const fileName = object ? object.split("/").pop() || object : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete object
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p>
            Delete{" "}
            <span className="font-mono font-medium text-foreground">
              {fileName}
            </span>
            ? This cannot be undone.
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {object}
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "Deleting…" : "Delete object"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
