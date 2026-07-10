import { NextRequest, NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { hermesErrorResponse } from "@/lib/hermes/server/http";
import { ensureInspector } from "@/lib/hermes/server/inspector";
import { dlqTopic } from "@/lib/hermes/server/dlq";

export const runtime = "nodejs";

// Dead-letter routing markers — stripped so the replayed message is clean.
const DLQ_MARKERS = new Set([
  "x-dead-letter-subscription",
  "x-delivery-attempts",
  "x-original-message-id",
]);

/**
 * POST /api/hermes/dlq/replay — redrive a dead-lettered message: re-publish its
 * payload (minus the dead-letter markers) to the origin topic, then ack it on
 * the inspector subscription to remove it from the DLQ. A publish that succeeds
 * but whose ack fails is surfaced (the message may replay again on re-browse).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      ackId?: string;
      originTopic?: string | null;
      payload?: string;
      attributes?: Record<string, string>;
    };
    if (!body.ackId || typeof body.payload !== "string") {
      return NextResponse.json(
        { error: "ackId and payload are required" },
        { status: 400 }
      );
    }
    if (!body.originTopic) {
      return NextResponse.json(
        { error: "origin topic is unknown — cannot replay" },
        { status: 400 }
      );
    }
    const topic = dlqTopic();
    if (!topic) {
      return NextResponse.json(
        { error: "no dead-letter topic configured" },
        { status: 400 }
      );
    }
    const subId = await ensureInspector(topic);

    const attributes = Object.fromEntries(
      Object.entries(body.attributes ?? {}).filter(([k]) => !DLQ_MARKERS.has(k))
    );

    const pub = await hermesFetch(
      `/v1/topics/${encodeURIComponent(body.originTopic)}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: body.payload, attributes }),
      }
    );
    if (!pub.ok) return hermesErrorResponse(pub);

    const ack = await hermesFetch(
      `/v1/subscriptions/${encodeURIComponent(subId)}/ack`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ackIds: [body.ackId] }),
      }
    );
    if (!ack.ok) {
      return NextResponse.json(
        { error: "republished to origin, but removing from the DLQ failed" },
        { status: 502 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}
