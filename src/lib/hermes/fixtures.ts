/**
 * In-memory fixtures HermesClient — drives the `/hermes` UI before a reachable
 * HermesMQ exists. Seed data is deterministic (fixed values, no Date/random at
 * load) so server and client render identical markup. Replaced by the live
 * BFF-backed HTTP client via the env selector in index.ts.
 */
import type { HealthStatus } from "@/lib/apollo/types";
import type { HermesClient } from "./client";
import { isInspectorSub } from "./inspector";
import type {
  Labels,
  PublishInput,
  PublishResult,
  Subscription,
  TapHandle,
  TapMessage,
  Topic,
  TopicSummary,
} from "./types";

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
  [
    // A clean topic with no real subscribers — the safe playground target.
    "zeus.playground",
    { labels: { purpose: "scratch" }, publishedTotal: 0, deleted: false },
  ],
]);

function requireTopic(topicId: string): StoredTopic {
  const t = store.get(topicId);
  if (!t || t.deleted) throw new Error(`Hermes 404: topic "${topicId}" not found`);
  return t;
}

// Subscriptions keyed by id, with varied queue-health stats (one dead-lettering).
const subscriptions = new Map<string, Subscription>([
  [
    "orders.fulfillment",
    {
      subscriptionId: "orders.fulfillment",
      topicId: "orders.events",
      backlog: 42,
      oldestUnackedAgeSeconds: 17,
      redeliveredTotal: 3,
      deadLetteredTotal: 0,
    },
  ],
  [
    "orders.analytics",
    {
      subscriptionId: "orders.analytics",
      topicId: "orders.events",
      backlog: 1289,
      oldestUnackedAgeSeconds: 634,
      redeliveredTotal: 51,
      deadLetteredTotal: 7,
    },
  ],
  [
    "audit.archiver",
    {
      subscriptionId: "audit.archiver",
      topicId: "audit.log",
      backlog: 0,
      oldestUnackedAgeSeconds: 0,
      redeliveredTotal: 0,
      deadLetteredTotal: 0,
    },
  ],
]);

// In-memory tap registry: topicId → set of live feed callbacks. Fixtures simulate
// a tap by echoing published messages back to any open tap on that topic.
const taps = new Map<string, Set<(m: TapMessage) => void>>();

function emitToTaps(topicId: string, message: TapMessage): void {
  taps.get(topicId)?.forEach((cb) => cb(message));
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

    async listSubscriptions(): Promise<Subscription[]> {
      return [...subscriptions.values()]
        .map((s) => ({ ...s }))
        .sort((a, b) => a.subscriptionId.localeCompare(b.subscriptionId));
    },

    async createSubscription(subscriptionId: string, topicId: string): Promise<void> {
      if (subscriptions.has(subscriptionId)) {
        throw new Error(`Hermes 409: subscription "${subscriptionId}" already exists`);
      }
      subscriptions.set(subscriptionId, {
        subscriptionId,
        topicId,
        backlog: 0,
        oldestUnackedAgeSeconds: 0,
        redeliveredTotal: 0,
        deadLetteredTotal: 0,
      });
    },

    async publish(input: PublishInput): Promise<PublishResult> {
      const messageId = crypto.randomUUID();
      // Echo onto any open tap for this topic so the "see interactions" loop works.
      emitToTaps(input.topicId, {
        id: crypto.randomUUID(),
        payload: input.payload,
        isText: true,
        attributes: { ...input.attributes },
        publishTime: new Date().toISOString(),
      });
      const t = store.get(input.topicId);
      if (t) t.publishedTotal += 1;
      return { messageId, deduplicated: false };
    },

    openTap(topicId: string): TapHandle {
      const cbs = new Set<(m: TapMessage) => void>();
      let statusCb: ((s: "open" | "error" | "closed") => void) | null = null;
      let set = taps.get(topicId);
      if (!set) {
        set = new Set();
        taps.set(topicId, set);
      }
      const bridge = (m: TapMessage) => cbs.forEach((cb) => cb(m));
      set.add(bridge);
      // Announce "open" asynchronously so callers can wire onStatus first.
      queueMicrotask(() => statusCb?.("open"));
      return {
        onMessage: (cb) => cbs.add(cb),
        onStatus: (cb) => {
          statusCb = cb;
        },
        close: () => {
          taps.get(topicId)?.delete(bridge);
          statusCb?.("closed");
        },
      };
    },

    async realSubscriberCount(topicId: string): Promise<number> {
      return [...subscriptions.values()].filter(
        (s) => s.topicId === topicId && !isInspectorSub(s.subscriptionId)
      ).length;
    },

    async checkHealth(): Promise<HealthStatus> {
      return "SERVING";
    },
  };
}
