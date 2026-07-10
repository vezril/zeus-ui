/**
 * Live HTTP implementation of the Hermes client. It calls Zeus's own
 * `/api/hermes/*` BFF routes (the Node-runtime REST proxy, task 2) — never
 * HermesMQ directly, so the browser holds no endpoint or token. Selected by
 * `NEXT_PUBLIC_HERMES_API_BASE` in index.ts.
 */
import type { HealthStatus } from "@/lib/apollo/types";
import type { HermesClient } from "./client";
import { isInspectorSub } from "./inspector";
import type {
  DeadLetter,
  DlqView,
  Labels,
  PublishInput,
  PublishResult,
  Subscription,
  TapHandle,
  TapMessage,
  Topic,
  TopicSummary,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Hermes ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function expectOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Hermes ${res.status} ${res.statusText}: ${body}`);
  }
}

export function httpHermesClient(base: string): HermesClient {
  const root = base.replace(/\/$/, "");
  const url = (path: string) => `${root}${path}`;
  const topicPath = (id: string) => `/topics/${encodeURIComponent(id)}`;

  return {
    async listTopics(): Promise<TopicSummary[]> {
      return json(await fetch(url(`/topics`)));
    },

    async getTopic(topicId: string): Promise<Topic> {
      return json(await fetch(url(topicPath(topicId))));
    },

    async createTopic(topicId: string, labels?: Labels): Promise<void> {
      await expectOk(
        await fetch(url(`/topics`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ topicId, labels: labels ?? {} }),
        })
      );
    },

    async updateLabels(topicId: string, labels: Labels): Promise<void> {
      await expectOk(
        await fetch(url(topicPath(topicId)), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ labels }),
        })
      );
    },

    async deleteTopic(topicId: string): Promise<void> {
      await expectOk(await fetch(url(topicPath(topicId)), { method: "DELETE" }));
    },

    async listSubscriptions(): Promise<Subscription[]> {
      return json(await fetch(url(`/subscriptions`)));
    },

    async createSubscription(
      subscriptionId: string,
      topicId: string
    ): Promise<void> {
      await expectOk(
        await fetch(url(`/subscriptions`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscriptionId, topicId }),
        })
      );
    },

    async publish(input: PublishInput): Promise<PublishResult> {
      return json(
        await fetch(url(`/publish`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        })
      );
    },

    openTap(topicId: string): TapHandle {
      const es = new EventSource(url(`/tap?topic=${encodeURIComponent(topicId)}`));
      const messageCbs = new Set<(m: TapMessage) => void>();
      let statusCb: ((s: "open" | "error" | "closed") => void) | null = null;
      es.addEventListener("message", (e) => {
        try {
          const m = JSON.parse(e.data) as TapMessage;
          messageCbs.forEach((cb) => cb(m));
        } catch {
          // Ignore malformed frames (e.g. keep-alive comments).
        }
      });
      es.addEventListener("tap-error", () => statusCb?.("error"));
      es.onopen = () => statusCb?.("open");
      es.onerror = () => statusCb?.("error");
      return {
        onMessage: (cb) => messageCbs.add(cb),
        onStatus: (cb) => {
          statusCb = cb;
        },
        close: () => {
          es.close();
          statusCb?.("closed");
        },
      };
    },

    async realSubscriberCount(topicId: string): Promise<number> {
      const subs = await json<Subscription[]>(await fetch(url(`/subscriptions`)));
      return subs.filter(
        (s) => s.topicId === topicId && !isInspectorSub(s.subscriptionId)
      ).length;
    },

    async listDeadLetters(): Promise<DlqView> {
      return json(await fetch(url(`/dlq`)));
    },

    async replayDeadLetter(message: DeadLetter): Promise<void> {
      await expectOk(
        await fetch(url(`/dlq/replay`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ackId: message.ackId,
            originTopic: message.originTopic,
            payload: message.payload,
            attributes: message.attributes,
          }),
        })
      );
    },

    async discardDeadLetter(ackId: string): Promise<void> {
      await expectOk(
        await fetch(url(`/dlq/discard`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ackId }),
        })
      );
    },

    async checkHealth(): Promise<HealthStatus> {
      return json(await fetch(url(`/health`)));
    },
  };
}
