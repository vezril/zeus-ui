"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client-side providers: TanStack Query (the client cache that drives health
 * polling and later infinite scroll and optimistic, visible-syncing mutations)
 * and the Radix tooltip provider (used by the disabled "coming soon" nav
 * stubs). Kept in one client component so the root layout stays a server
 * component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Apollo's list read-model is eventually consistent; keep pages
            // warm and lean on explicit refetch for visible-syncing confirms.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
