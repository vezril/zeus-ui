import { NextRequest, NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { proxyHermes } from "@/lib/hermes/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const topicPath = (id: string) => `/v1/topics/${encodeURIComponent(id)}`;

function bffError(e: unknown): NextResponse {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Hermes BFF error" },
    { status: 500 }
  );
}

/** GET /api/hermes/topics/{id} — a topic's labels ({ topicId, labels }). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    return proxyHermes(await hermesFetch(topicPath(id)));
  } catch (e) {
    return bffError(e);
  }
}

/** PATCH /api/hermes/topics/{id} — replace the topic's label map. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      labels?: Record<string, string>;
    };
    const res = await hermesFetch(topicPath(id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ labels: body.labels ?? {} }),
    });
    return proxyHermes(res);
  } catch (e) {
    return bffError(e);
  }
}

/** DELETE /api/hermes/topics/{id} — DeleteTopic. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    return proxyHermes(await hermesFetch(topicPath(id), { method: "DELETE" }));
  } catch (e) {
    return bffError(e);
  }
}
