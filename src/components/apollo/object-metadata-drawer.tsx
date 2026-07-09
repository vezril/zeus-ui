"use client";

import * as React from "react";
import { Download, Eye, Loader2, Trash2 } from "lucide-react";

import { getClient } from "@/lib/apollo";
import { formatBytes } from "@/lib/format";
import { useObjectMetadata } from "@/lib/hooks/use-objects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-all font-mono text-sm">{value || "—"}</dd>
    </div>
  );
}

/**
 * Object metadata drawer (task 4.2). Opening it fetches only `HeadObject` — no
 * payload is transferred. Download and image preview (task 4.3) are explicit
 * actions that stream `GetObject` through the BFF on demand.
 */
export function ObjectMetadataDrawer({
  bucket,
  object,
  onOpenChange,
  onDelete,
}: {
  bucket: string;
  object: string | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (object: string) => void;
}) {
  const open = object !== null;
  const meta = useObjectMetadata(bucket, object, open);
  const [showPreview, setShowPreview] = React.useState(false);

  // Reset the preview toggle whenever the target object changes.
  React.useEffect(() => setShowPreview(false), [object]);

  const isImage = meta.data?.contentType.startsWith("image/") ?? false;
  const href = object ? getClient().objectUrl(bucket, object) : "#";
  const fileName = object ? object.split("/").pop() || object : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="break-all font-mono">{fileName}</SheetTitle>
        </SheetHeader>

        {meta.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : meta.isError ? (
          <p className="text-sm text-destructive">
            {(meta.error as Error).message}
          </p>
        ) : meta.data ? (
          <div className="space-y-5">
            <dl className="space-y-3">
              <Field label="Key" value={meta.data.object} />
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Content type
                  </dt>
                  <dd className="mt-0.5">
                    <Badge variant="outline">{meta.data.contentType}</Badge>
                  </dd>
                </div>
                <Field
                  label="Size"
                  value={`${formatBytes(meta.data.size)} (${meta.data.size} B)`}
                />
                <Field label="Generation" value={meta.data.generation} />
              </div>
              <Field label="crc32c" value={meta.data.crc32c} />
              <Field label="md5" value={meta.data.md5} />
            </dl>

            {isImage && (
              <div className="space-y-2">
                {showPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={href}
                    alt={fileName}
                    className="max-h-64 w-full rounded-md border border-border object-contain"
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="size-4" />
                    Show preview
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <a href={href} download={fileName}>
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => object && onDelete(object)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
