import { NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import type { HealthStatus } from "@/lib/apollo/types";

export const runtime = "nodejs";

/**
 * GET /api/hermes/health — HermesMQ's public `/health` via the BFF. Maps
 * `{ status: "UP" }` to SERVING; anything else (or unreachable) to NOT_SERVING
 * so the dashboard tile shows "down" rather than erroring.
 */
export async function GET() {
  try {
    const res = await hermesFetch("/health");
    if (!res.ok) return NextResponse.json<HealthStatus>("NOT_SERVING");
    const body = (await res.json().catch(() => null)) as { status?: string } | null;
    const ui: HealthStatus = body?.status === "UP" ? "SERVING" : "NOT_SERVING";
    return NextResponse.json(ui);
  } catch {
    return NextResponse.json<HealthStatus>("NOT_SERVING");
  }
}
