import "server-only";

import { hermesFetch } from "./client";

/**
 * The configured dead-letter topic name (`HERMES_DLQ_TOPIC`). HermesMQ routes
 * dead-letters to this topic; Zeus reads it via a Zeus-managed inspector
 * subscription (reusing the playground's `ensureInspector`). Null when unset —
 * the DLQ view then shows a "not configured" state.
 */
export function dlqTopic(): string | null {
  return process.env.HERMES_DLQ_TOPIC || null;
}

/**
 * Map each subscription id → its bound topic (via `GET /v1/subscriptions`), so a
 * dead-letter's `x-dead-letter-subscription` can be resolved to the origin topic
 * for replay. Returns an empty map on failure (origin then unresolvable).
 */
export async function subscriptionTopicMap(): Promise<Map<string, string>> {
  const res = await hermesFetch("/v1/subscriptions");
  if (!res.ok) return new Map();
  const subs = (await res.json()) as { subscriptionId: string; topicId: string }[];
  return new Map(subs.map((s) => [s.subscriptionId, s.topicId]));
}
