/**
 * The typed Hermes client interface. A fixtures-backed implementation drives
 * development before a reachable HermesMQ exists; the live HTTP implementation
 * calls Zeus's own `/api/hermes/*` BFF routes and is selected by
 * `NEXT_PUBLIC_HERMES_API_BASE` in `index.ts`. Mirrors the Apollo client seam.
 */
import type { HealthStatus } from "@/lib/apollo/types";
import type {
  DeadLetter,
  DlqView,
  Labels,
  PublishInput,
  PublishResult,
  Subscription,
  TapHandle,
  Topic,
  TopicSummary,
} from "./types";

export interface HermesClient {
  /** GET /api/hermes/topics — list topics (id + published count; deleted excluded). */
  listTopics(): Promise<TopicSummary[]>;

  /** GET /api/hermes/topics/{id} — a topic's labels. */
  getTopic(topicId: string): Promise<Topic>;

  /** POST /api/hermes/topics — create. Rejects on duplicate (409) / bad id (400). */
  createTopic(topicId: string, labels?: Labels): Promise<void>;

  /** PATCH /api/hermes/topics/{id} — replace the topic's label map. */
  updateLabels(topicId: string, labels: Labels): Promise<void>;

  /** DELETE /api/hermes/topics/{id} — delete a topic. */
  deleteTopic(topicId: string): Promise<void>;

  /** GET /api/hermes/subscriptions — subscriptions with their queue-health stats. */
  listSubscriptions(): Promise<Subscription[]>;

  /** POST /api/hermes/subscriptions — create a subscription bound to a topic. */
  createSubscription(subscriptionId: string, topicId: string): Promise<void>;

  /** POST /api/hermes/publish — publish a message to a topic. */
  publish(input: PublishInput): Promise<PublishResult>;

  /**
   * Open a live tap on a topic (via a Zeus-managed inspector subscription).
   * Live: an EventSource over the SSE `/api/hermes/tap`. Fixtures: an in-memory
   * echo of messages published this session.
   */
  openTap(topicId: string): TapHandle;

  /** GET /api/hermes/subscriptions filtered — count of real (non-inspector) subscribers on a topic. */
  realSubscriberCount(topicId: string): Promise<number>;

  /** GET /api/hermes/dlq — the dead-letter triage view (configured state + leased batch). */
  listDeadLetters(): Promise<DlqView>;

  /** POST /api/hermes/dlq/replay — re-publish to the origin topic and remove from the DLQ. */
  replayDeadLetter(message: DeadLetter): Promise<void>;

  /** POST /api/hermes/dlq/discard — remove from the DLQ without republishing. */
  discardDeadLetter(ackId: string): Promise<void>;

  /** GET /api/hermes/health — HermesMQ health via the BFF (for the dashboard tile). */
  checkHealth(): Promise<HealthStatus>;
}
