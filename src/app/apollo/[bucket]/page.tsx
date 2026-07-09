import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Database } from "lucide-react";

export const metadata: Metadata = {
  title: "Bucket",
};

/**
 * Object browser placeholder. The prefix navigation, metadata drawer, download,
 * upload, and per-object actions (tasks 4.x–5.x) render here; for now this
 * confirms bucket rows navigate into their own route within the shell.
 */
export default async function BucketPage({
  params,
}: {
  params: Promise<{ bucket: string }>;
}) {
  const { bucket } = await params;
  const name = decodeURIComponent(bucket);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/apollo"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Buckets
      </Link>
      <header className="mb-6 flex items-center gap-3">
        <Database className="size-6 text-primary" />
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          {name}
        </h1>
      </header>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Object browsing and uploads land here next (Phase 4–5).
      </div>
    </div>
  );
}
