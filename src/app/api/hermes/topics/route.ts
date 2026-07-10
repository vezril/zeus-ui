import { NextRequest, NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { hermesErrorResponse, proxyHermes } from "@/lib/hermes/server/http";
import type { TopicSummary } from "@/lib/hermes/types";

export const runtime = "nodejs";

interface HermesTopicStats {
  topicId: string;
  publishedTotal: number;
  deleted: boolean;
}

/** GET /api/hermes/topics — list topics (id + published count; tombstones dropped). */
export async function GET() {
  try {
    const res = await hermesFetch("/v1/topics");
    if (!res.ok) return hermesErrorResponse(res);
    const stats = (await res.json()) as HermesTopicStats[];
    const topics: TopicSummary[] = stats
      .filter((t) => !t.deleted)
      .map((t) => ({ topicId: t.topicId, publishedTotal: t.publishedTotal }));
    return NextResponse.json(topics);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}

/** POST /api/hermes/topics — CreateTopic. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      topicId?: unknown;
      labels?: Record<string, string>;
    };
    if (typeof body.topicId !== "string" || !body.topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 });
    }
    const res = await hermesFetch("/v1/topics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topicId: body.topicId, labels: body.labels ?? {} }),
    });
    return proxyHermes(res);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hermes BFF error" },
      { status: 500 }
    );
  }
}
