/**
 * Apollo client selector. Uses fixtures by default so the UI is fully navigable
 * before a reachable Apollo exists; task 7.1 sets `NEXT_PUBLIC_APOLLO_API_BASE`
 * (a same-origin path like `/api/apollo`, NOT a secret) to swap in the live
 * BFF-backed HTTP client. Apollo's endpoint/token/TLS stay server-side in the
 * BFF — the browser only ever talks to Zeus's own routes.
 */
import type { ApolloClient } from "./client";
import { fixtureClient } from "./fixtures";
import { httpClient } from "./http";

let client: ApolloClient | null = null;

export function getClient(): ApolloClient {
  if (client) return client;
  const base = process.env.NEXT_PUBLIC_APOLLO_API_BASE;
  client = base ? httpClient(base) : fixtureClient();
  return client;
}

export type { ApolloClient } from "./client";
export * from "./types";
