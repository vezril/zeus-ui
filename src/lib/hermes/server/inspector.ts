import "server-only";

import { hermesFetch } from "./client";
import { INSPECTOR_PREFIX, inspectorSubId } from "../inspector";

/** The configured inspector-subscription prefix (defaults to the shared constant). */
export function inspectorPrefix(): string {
  return process.env.HERMES_INSPECTOR_PREFIX || INSPECTOR_PREFIX;
}

/**
 * Ensure the Zeus inspector subscription for a topic exists (idempotent: 201
 * created or 409 already-exists are both fine). Returns its subscription id.
 * The inspector receives a fan-out copy of the topic's traffic without stealing
 * from real consumers.
 */
export async function ensureInspector(topicId: string): Promise<string> {
  const subId = inspectorSubId(inspectorPrefix(), topicId);
  const res = await hermesFetch("/v1/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscriptionId: subId, topicId }),
  });
  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Hermes ${res.status}: could not ensure inspector for "${topicId}": ${body}`
    );
  }
  return subId;
}
