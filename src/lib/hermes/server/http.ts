import "server-only";

import { NextResponse } from "next/server";

/**
 * HermesMQ REST status → browser HTTP mapping for the BFF (task 2.2). Most
 * statuses pass through (409 already-exists, 400 bad id, 404 not found, 503
 * unavailable); 403 becomes 502 because it means Zeus's HERMES_TOKEN lacks the
 * `admin` scope — an operator misconfiguration, not a user error (parallels the
 * Apollo bridge's UNAUTHENTICATED→502).
 */
export function mapHermesStatus(status: number): number {
  return status === 403 ? 502 : status;
}

/** Turn an errored HermesMQ response into a mapped JSON error response. */
export async function hermesErrorResponse(res: Response): Promise<NextResponse> {
  const body = await res.text().catch(() => "");
  return NextResponse.json(
    { error: body || res.statusText, hermesStatus: res.status },
    { status: mapHermesStatus(res.status) }
  );
}

/**
 * Proxy a HermesMQ response to the browser, or map an error. Forwards a JSON
 * body only when Hermes actually returns JSON (GET topic); Hermes's write
 * responses carry a plain-text body (201/200 "…created/fulfilled"), so those
 * pass through as status-only — the client only checks the status for writes.
 */
export async function proxyHermes(
  res: Response,
  okStatus?: number
): Promise<NextResponse> {
  if (!res.ok) return hermesErrorResponse(res);
  const status = okStatus ?? res.status;
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 204 || !contentType.includes("application/json")) {
    return new NextResponse(null, { status });
  }
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status });
}
