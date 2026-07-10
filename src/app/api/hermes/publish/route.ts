import { NextRequest, NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { hermesErrorResponse } from "@/lib/hermes/server/http";
import type { PublishResult } from "@/lib/hermes/types";

export const runtime = "nodejs";

/**
 * POST /api/hermes/publish — publish a message to a topic via HermesMQ's
 * `POST /v1/topics/{id}/messages` (payload + attributes, optional ttl +
 * idempotency key). Returns { messageId, deduplicated }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      topicId?: unknown;
      payload?: unknown;
      attributes?: Record<string, string>;
      ttlSeconds?: number;
      idempotencyKey?: string;
    };
    if (typeof body.topicId !== "string" || !body.topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 });
    }
    if (typeof body.payload !== "string") {
      return NextResponse.json({ error: "payload is required" }, { status: 400 });
    }
    const res = await hermesFetch(
      `/v1/topics/${encodeURIComponent(body.topicId)}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload: body.payload,
          attributes: body.attributes ?? {},
          ttlSeconds: body.ttlSeconds,
          idempotencyKey: body.idempotencyKey || undefined,
        }),
      }
    );
    if (!res.ok) return hermesErrorResponse(res);
    const result = (await res.json()) as PublishResult;
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}
