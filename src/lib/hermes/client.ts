/**
 * The typed Hermes client interface. A fixtures-backed implementation drives
 * development before a reachable HermesMQ exists; the live HTTP implementation
 * calls Zeus's own `/api/hermes/*` BFF routes and is selected by
 * `NEXT_PUBLIC_HERMES_API_BASE` in `index.ts`. Mirrors the Apollo client seam.
 */
import type { HealthStatus } from "@/lib/apollo/types";
import type { Labels, Topic, TopicSummary } from "./types";

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

  /** GET /api/hermes/health — HermesMQ health via the BFF (for the dashboard tile). */
  checkHealth(): Promise<HealthStatus>;
}
