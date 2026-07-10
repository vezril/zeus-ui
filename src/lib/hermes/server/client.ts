import "server-only";

/**
 * Server-only HermesMQ REST access for the BFF (task 2.1). Reads the endpoint
 * and bearer token from server config and injects the token as an
 * `Authorization: Bearer` header. `HERMES_TOKEN` never leaves the server (never
 * `NEXT_PUBLIC_*`); `import "server-only"` makes importing this from a client
 * component a build error. `path` is the full path from Hermes's root
 * (e.g. `/v1/topics`, `/health`).
 */
function requireEndpoint(): string {
  const endpoint = process.env.HERMES_ENDPOINT;
  if (!endpoint) {
    throw new Error("HERMES_ENDPOINT is not set — the Hermes BFF cannot reach HermesMQ");
  }
  return endpoint.replace(/\/$/, "");
}

export function hermesFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = process.env.HERMES_TOKEN;
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${requireEndpoint()}${path}`, { ...init, headers });
}
