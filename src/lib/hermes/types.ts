/**
 * The HermesMQ surface Zeus consumes, as browser-facing DTOs. HermesMQ is
 * REST-first (unlike gRPC-only Apollo); the Node BFF (task 2) proxies its `/v1`
 * admin API and returns these JSON shapes, so the browser never holds the
 * Hermes token.
 */

/** A topic label map (arbitrary string key/value metadata). */
export type Labels = Record<string, string>;

/**
 * A row in the topic listing. Sourced from `GET /v1/topics`
 * (`{ topicId, publishedTotal, deleted }`) — the listing carries no labels;
 * those are fetched per-topic for the edit view.
 */
export interface TopicSummary {
  topicId: string;
  publishedTotal: number;
}

/** Full topic detail from `GET /v1/topics/{id}` (`{ topicId, labels }`). */
export interface Topic {
  topicId: string;
  labels: Labels;
}

/**
 * A subscription with its queue-health stats, from `GET /v1/subscriptions`
 * (an eventually-consistent stats projection). `backlog` is the queue depth;
 * `deadLetteredTotal` is the dead-letter count (HermesMQ exposes no DLQ message
 * browse/replay — only this count).
 */
export interface Subscription {
  subscriptionId: string;
  topicId: string;
  backlog: number;
  oldestUnackedAgeSeconds: number;
  redeliveredTotal: number;
  deadLetteredTotal: number;
}
