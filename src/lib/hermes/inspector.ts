/**
 * Zeus-managed inspector subscriptions (playground tap): a Zeus-owned
 * subscription per tapped topic, named `{prefix}-{topic}`, that receives a
 * fan-out copy of the topic's traffic without stealing from real consumers.
 * The prefix is a naming convention (not a secret) so the browser can also
 * recognize inspector subs when counting real subscribers.
 */
export const INSPECTOR_PREFIX = "zeus-inspector";

/** The inspector subscription id for a topic under a given prefix. */
export function inspectorSubId(prefix: string, topicId: string): string {
  return `${prefix}-${topicId}`;
}

/** Whether a subscription id is a Zeus inspector sub (any inspector prefix form). */
export function isInspectorSub(subscriptionId: string): boolean {
  return subscriptionId.startsWith(`${INSPECTOR_PREFIX}-`);
}
