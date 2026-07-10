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

// --- Playground: publish + live tap ---

/** Input to publish a message to a topic (REST publish exposes ttl + idempotency). */
export interface PublishInput {
  topicId: string;
  payload: string;
  attributes: Labels;
  ttlSeconds?: number;
  idempotencyKey?: string;
}

/** `POST /v1/topics/{id}/messages` result. */
export interface PublishResult {
  messageId: string;
  deduplicated: boolean;
}

/**
 * A message observed on the inspector tap (a fan-out copy of a topic's traffic).
 * HermesMQ's REST pull carries no original message id, so `id` is a per-
 * observation identifier (the ack id live / a uuid in fixtures) used for keys;
 * message identity/"mine" is carried in `attributes` (the playground stamps a
 * marker attribute on its own publishes).
 */
export interface TapMessage {
  id: string;
  payload: string;
  /** false when the payload is not valid UTF-8 text (binary — flagged, not rendered). */
  isText: boolean;
  attributes: Labels;
  publishTime: string;
}

/** Attribute the playground stamps on its own publishes so the tap can flag them "mine". */
export const TAP_ORIGIN_ATTR = "x-zeus-tap-origin";

/** A live tap on a topic. `onMessage` fires per arriving message; `close()` stops it. */
export interface TapHandle {
  onMessage(cb: (message: TapMessage) => void): void;
  onStatus(cb: (status: "open" | "error" | "closed") => void): void;
  close(): void;
}

// --- Dead-letter triage ---

/**
 * A dead-lettered message on the configured dead-letter topic. HermesMQ routes
 * dead-letters there with `x-dead-letter-subscription`, `x-delivery-attempts`,
 * and `x-original-message-id` attributes. `ackId` identifies the leased copy
 * (for replay/discard). `originTopic` is derived from the source subscription;
 * null when it can't be resolved (replay then unavailable).
 */
export interface DeadLetter {
  ackId: string;
  payload: string;
  isText: boolean;
  sourceSubscription: string;
  deliveryAttempts: string;
  originalMessageId: string;
  originTopic: string | null;
  publishTime: string;
  attributes: Labels;
}

/** The dead-letter triage view: configured state + the current leased batch. */
export interface DlqView {
  configured: boolean;
  dlqTopic: string | null;
  messages: DeadLetter[];
}
