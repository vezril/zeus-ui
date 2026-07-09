"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Client-side providers. For the scaffold this is just TanStack Query (the
 * client cache that later drives infinite scroll and optimistic, visible-
 * syncing mutations). The Radix TooltipProvider and other shell providers are
 * added with the app-shell work (task 1.1). Kept in one client component so
 * the root layout can stay a server component.
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
