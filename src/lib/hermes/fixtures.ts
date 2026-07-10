/**
 * In-memory fixtures HermesClient — drives the `/hermes` UI before a reachable
 * HermesMQ exists. Seed data is deterministic (fixed values, no Date/random at
 * load) so server and client render identical markup. Replaced by the live
 * BFF-backed HTTP client via the env selector in index.ts.
 */
import type { HealthStatus } from "@/lib/apollo/types";
import type { HermesClient } from "./client";
import type { Labels, Topic, TopicSummary } from "./types";

interface StoredTopic {
  labels: Labels;
  publishedTotal: number;
  deleted: boolean;
}

const store = new Map<string, StoredTopic>([
  [
    "orders.events",
    { labels: { team: "commerce", tier: "gold" }, publishedTotal: 128_402, deleted: false },
  ],
  [
    "media.ingested",
    { labels: { team: "media" }, publishedTotal: 5_531, deleted: false },
  ],
  [
    "audit.log",
    { labels: {}, publishedTotal: 902_113, deleted: false },
  ],
]);

function requireTopic(topicId: string): StoredTopic {
  const t = store.get(topicId);
  if (!t || t.deleted) throw new Error(`Hermes 404: topic "${topicId}" not found`);
  return t;
}

export function fixtureHermesClient(): HermesClient {
  return {
    async listTopics(): Promise<TopicSummary[]> {
      return [...store.entries()]
        .filter(([, t]) => !t.deleted)
        .map(([topicId, t]) => ({ topicId, publishedTotal: t.publishedTotal }))
        .sort((a, b) => a.topicId.localeCompare(b.topicId));
    },

    async getTopic(topicId: string): Promise<Topic> {
      const t = requireTopic(topicId);
      return { topicId, labels: { ...t.labels } };
    },

    async createTopic(topicId: string, labels?: Labels): Promise<void> {
      const existing = store.get(topicId);
      if (existing && !existing.deleted) {
        throw new Error(`Hermes 409: topic "${topicId}" already exists`);
      }
      store.set(topicId, { labels: labels ?? {}, publishedTotal: 0, deleted: false });
    },

    async updateLabels(topicId: string, labels: Labels): Promise<void> {
      const t = requireTopic(topicId);
      t.labels = { ...labels };
    },

    async deleteTopic(topicId: string): Promise<void> {
      const t = requireTopic(topicId);
      t.deleted = true;
    },

    async checkHealth(): Promise<HealthStatus> {
      return "SERVING";
    },
  };
}
