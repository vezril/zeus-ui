/**
 * Hermes client selector. Uses fixtures by default so the `/hermes` UI is fully
 * navigable before a reachable HermesMQ exists; set `NEXT_PUBLIC_HERMES_API_BASE`
 * (a same-origin path like `/api/hermes`, NOT a secret) to swap in the live
 * BFF-backed HTTP client. HermesMQ's endpoint/token stay server-side in the BFF.
 */
import type { HermesClient } from "./client";
import { fixtureHermesClient } from "./fixtures";
import { httpHermesClient } from "./http";

let client: HermesClient | null = null;

export function getHermesClient(): HermesClient {
  if (client) return client;
  const base = process.env.NEXT_PUBLIC_HERMES_API_BASE;
  client = base ? httpHermesClient(base) : fixtureHermesClient();
  return client;
}

export type { HermesClient } from "./client";
export * from "./types";
