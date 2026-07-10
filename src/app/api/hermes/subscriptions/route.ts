import { NextRequest, NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { hermesErrorResponse, proxyHermes } from "@/lib/hermes/server/http";
import type { Subscription } from "@/lib/hermes/types";

export const runtime = "nodejs";

/**
 * GET /api/hermes/subscriptions — list subscriptions with queue-health stats.
 * HermesMQ's shape already matches the Subscription DTO, so this is a passthrough
 * (kept explicit so the browser contract is decoupled from the upstream shape).
 */
export async function GET() {
  try {
    const res = await hermesFetch("/v1/subscriptions");
    if (!res.ok) return hermesErrorResponse(res);
    const stats = (await res.json()) as Subscription[];
    const subscriptions: Subscription[] = stats.map((s) => ({
      subscriptionId: s.subscriptionId,
      topicId: s.topicId,
      backlog: s.backlog,
      oldestUnackedAgeSeconds: s.oldestUnackedAgeSeconds,
      redeliveredTotal: s.redeliveredTotal,
      deadLetteredTotal: s.deadLetteredTotal,
    }));
    return NextResponse.json(subscriptions);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}

/** POST /api/hermes/subscriptions — CreateSubscription. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      subscriptionId?: unknown;
      topicId?: unknown;
    };
    if (
      typeof body.subscriptionId !== "string" ||
      !body.subscriptionId ||
      typeof body.topicId !== "string" ||
      !body.topicId
    ) {
      return NextResponse.json(
        { error: "subscriptionId and topicId are required" },
        { status: 400 }
      );
    }
    const res = await hermesFetch("/v1/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscriptionId: body.subscriptionId,
        topicId: body.topicId,
      }),
    });
    return proxyHermes(res);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}
