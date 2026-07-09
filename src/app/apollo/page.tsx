import type { Metadata } from "next";
import { Boxes } from "lucide-react";

export const metadata: Metadata = {
  title: "Apollo",
};

/**
 * Apollo module landing — the `/apollo/**` route group established in the shell
 * (task 1.1). The bucket list (task 3.1) and object browser (task 4.x) replace
 * this placeholder; for now it confirms the module renders inside the shared
 * shell without a full-page reload.
 */
export default function ApolloHome() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Boxes className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apollo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Object storage — buckets, objects, uploads.
          </p>
        </div>
      </header>

      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Bucket management lands here next (Phase 3). The shell, navigation, and
        typed Apollo client are already in place.
      </div>
    </div>
  );
}
