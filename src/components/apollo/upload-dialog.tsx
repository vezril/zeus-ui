"use client";

import * as React from "react";
import { CheckCircle2, FileIcon, Loader2, X } from "lucide-react";

import { getClient } from "@/lib/apollo";
import type { PutObjectResult } from "@/lib/apollo";
import { validateObjectKey } from "@/lib/apollo/validation";
import { composeKey, detectContentType } from "@/lib/upload";
import { formatBytes } from "@/lib/format";
import { uid } from "@/lib/uid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Dropzone } from "./dropzone";

interface UploadItem {
  id: string;
  file: File;
  key: string;
  contentType: string;
  previewUrl: string | null;
  status: "ready" | "uploading" | "done" | "error";
  progress: number;
  error: string | null;
  result: PutObjectResult | null;
}

/**
 * Upload dialog (tasks 5.1–5.4): drag-drop/picker intake with local image
 * preview and content-type detection, per-file object-key validation before any
 * bytes stream, a progress bar during the streamed PutObject, and the returned
 * generation + server-computed checksums on success. Each committed key is
 * reported so the browser can show it with the syncing treatment.
 */
export function UploadDialog({
  bucket,
  prefix,
  open,
  onOpenChange,
  onUploaded,
}: {
  bucket: string;
  prefix: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (key: string) => void;
}) {
  const [items, setItems] = React.useState<UploadItem[]>([]);

  const patch = React.useCallback(
    (id: string, next: Partial<UploadItem>) =>
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...next } : it))
      ),
    []
  );

  function addFiles(files: File[]) {
    const added: UploadItem[] = files.map((file) => ({
      id: uid(),
      file,
      key: composeKey(prefix, file.name),
      contentType: detectContentType(file),
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
      status: "ready",
      progress: 0,
      error: null,
      result: null,
    }));
    setItems((prev) => [...prev, ...added]);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  }

  // Revoke any object URLs when the dialog closes / unmounts.
  const clearItems = React.useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
      return [];
    });
  }, []);
  React.useEffect(() => () => clearItems(), [clearItems]);

  async function uploadItem(item: UploadItem) {
    const keyError = validateObjectKey(item.key);
    if (keyError) {
      patch(item.id, { status: "error", error: keyError });
      return;
    }
    patch(item.id, { status: "uploading", progress: 0, error: null });
    try {
      const result = await getClient().putObject(
        {
          bucket,
          object: item.key,
          contentType: item.contentType,
          body: item.file,
        },
        (fraction) => patch(item.id, { progress: fraction })
      );
      patch(item.id, { status: "done", progress: 1, result });
      onUploaded(item.key);
    } catch (e) {
      patch(item.id, { status: "error", error: (e as Error).message });
    }
  }

  async function uploadAll() {
    // Sequential so progress reads clearly and Apollo isn't hammered.
    for (const item of items) {
      if (item.status === "ready" && !validateObjectKey(item.key)) {
        await uploadItem(item);
      }
    }
  }

  const readyCount = items.filter(
    (it) => it.status === "ready" && !validateObjectKey(it.key)
  ).length;
  const anyUploading = items.some((it) => it.status === "uploading");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) clearItems();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Upload to{" "}
            <span className="font-mono">
              {bucket}/{prefix}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Dropzone onFiles={addFiles} />

        {items.length > 0 && (
          <ul className="max-h-[45vh] space-y-2 overflow-y-auto">
            {items.map((item) => {
              const keyError =
                item.status === "error" && item.error
                  ? item.error
                  : validateObjectKey(item.key);
              return (
                <li
                  key={item.id}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    {item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="size-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <FileIcon className="size-10 shrink-0 rounded bg-muted p-2 text-muted-foreground" />
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <Input
                        value={item.key}
                        disabled={
                          item.status === "uploading" || item.status === "done"
                        }
                        onChange={(e) => patch(item.id, { key: e.target.value })}
                        className="h-8 font-mono text-xs"
                        aria-invalid={!!keyError && item.status !== "done"}
                        spellCheck={false}
                      />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{item.contentType}</Badge>
                        <span>{formatBytes(item.file.size)}</span>
                      </div>
                      {keyError && item.status !== "done" && (
                        <p className="text-xs text-destructive">{keyError}</p>
                      )}
                    </div>

                    {item.status !== "uploading" && item.status !== "done" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove"
                        className="shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                    {item.status === "done" && (
                      <CheckCircle2 className="size-5 shrink-0 text-status-serving" />
                    )}
                  </div>

                  {item.status === "uploading" && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-[width] duration-150"
                        style={{ width: `${Math.round(item.progress * 100)}%` }}
                      />
                    </div>
                  )}

                  {item.status === "done" && item.result && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-2 text-xs">
                      <div className="flex gap-1">
                        <dt className="text-muted-foreground">generation</dt>
                        <dd className="font-mono">{item.result.generation}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="text-muted-foreground">size</dt>
                        <dd className="font-mono">{item.result.size}</dd>
                      </div>
                      <div className="col-span-2 flex gap-1 truncate">
                        <dt className="text-muted-foreground">crc32c</dt>
                        <dd className="truncate font-mono">
                          {item.result.crc32c}
                        </dd>
                      </div>
                      <div className="col-span-2 flex gap-1 truncate">
                        <dt className="text-muted-foreground">md5</dt>
                        <dd className="truncate font-mono">{item.result.md5}</dd>
                      </div>
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {items.every((it) => it.status === "done") && items.length > 0
              ? "Done"
              : "Close"}
          </Button>
          <Button
            disabled={readyCount === 0 || anyUploading}
            onClick={uploadAll}
            className={cn(anyUploading && "opacity-70")}
          >
            {anyUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              `Upload ${readyCount || ""} file${readyCount === 1 ? "" : "s"}`.trim()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
