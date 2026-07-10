import { NextRequest, NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { hermesErrorResponse } from "@/lib/hermes/server/http";
import { ensureInspector } from "@/lib/hermes/server/inspector";
import { dlqTopic } from "@/lib/hermes/server/dlq";

export const runtime = "nodejs";

/**
 * POST /api/hermes/dlq/discard — remove a dead-lettered message from the DLQ
 * without republishing (ack it on the inspector subscription).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { ackId?: string };
    if (!body.ackId) {
      return NextResponse.json({ error: "ackId is required" }, { status: 400 });
    }
    const topic = dlqTopic();
    if (!topic) {
      return NextResponse.json(
        { error: "no dead-letter topic configured" },
        { status: 400 }
      );
    }
    const subId = await ensureInspector(topic);
    const ack = await hermesFetch(
      `/v1/subscriptions/${encodeURIComponent(subId)}/ack`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ackIds: [body.ackId] }),
      }
    );
    if (!ack.ok) return hermesErrorResponse(ack);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}
