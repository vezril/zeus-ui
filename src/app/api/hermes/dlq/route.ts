import { NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { hermesErrorResponse } from "@/lib/hermes/server/http";
import { ensureInspector } from "@/lib/hermes/server/inspector";
import { dlqTopic, subscriptionTopicMap } from "@/lib/hermes/server/dlq";
import type { DeadLetter, DlqView } from "@/lib/hermes/types";

export const runtime = "nodejs";

interface PulledMessage {
  ackId: string;
  payload: string;
  attributes: Record<string, string>;
  publishTime: string;
}

const PULL_MAX = 25;

/**
 * GET /api/hermes/dlq — the dead-letter triage view. When no dead-letter topic
 * is configured, returns a not-configured state. Otherwise pulls a batch from a
 * Zeus-managed inspector on the DLQ topic — WITHOUT acking (this is triage: the
 * operator replays or discards each message, which acks it) — and resolves each
 * message's origin topic from its source subscription.
 */
export async function GET() {
  try {
    const topic = dlqTopic();
    if (!topic) {
      const empty: DlqView = { configured: false, dlqTopic: null, messages: [] };
      return NextResponse.json(empty);
    }

    const subId = await ensureInspector(topic);
    const res = await hermesFetch(
      `/v1/subscriptions/${encodeURIComponent(subId)}/pull`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ max: PULL_MAX }),
      }
    );
    if (!res.ok) return hermesErrorResponse(res);

    const { messages } = (await res.json()) as { messages: PulledMessage[] };
    const originBySub = await subscriptionTopicMap();

    const dead: DeadLetter[] = messages.map((m) => {
      const a = m.attributes ?? {};
      const source = a["x-dead-letter-subscription"] ?? "";
      return {
        ackId: m.ackId,
        payload: m.payload,
        isText: !m.payload.includes("�"),
        sourceSubscription: source,
        deliveryAttempts: a["x-delivery-attempts"] ?? "",
        originalMessageId: a["x-original-message-id"] ?? "",
        originTopic: originBySub.get(source) ?? null,
        publishTime: m.publishTime,
        attributes: a,
      };
    });

    const view: DlqView = { configured: true, dlqTopic: topic, messages: dead };
    return NextResponse.json(view);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}
