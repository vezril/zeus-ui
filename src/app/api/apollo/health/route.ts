import { NextResponse } from "next/server";

import { authMetadata, health } from "@/lib/apollo/server/client";
import type { HealthServingStatus } from "@/lib/apollo/server/client";
import type { HealthStatus } from "@/lib/apollo/types";

export const runtime = "nodejs";

/**
 * GET /api/apollo/health — Apollo's grpc.health.v1.Health via the BFF. Health
 * is auth-exempt on Apollo, so no token is strictly required, but authMetadata()
 * is harmless if set. Unreachable Apollo collapses to NOT_SERVING so the
 * dashboard tile shows "down" rather than erroring.
 */
export async function GET() {
  try {
    const status = await new Promise<HealthServingStatus>((resolve, reject) => {
      health().check("", authMetadata(), (err, s) =>
        err ? reject(err) : resolve(s)
      );
    });
    const ui: HealthStatus =
      status === "SERVING"
        ? "SERVING"
        : status === "NOT_SERVING"
          ? "NOT_SERVING"
          : "UNKNOWN";
    return NextResponse.json(ui);
  } catch {
    return NextResponse.json<HealthStatus>("NOT_SERVING");
  }
}
