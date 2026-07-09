import "server-only";

import { readFileSync } from "node:fs";

import {
  ChannelCredentials,
  Client,
  Metadata,
  credentials,
  makeGenericClientConstructor,
  type ClientOptions,
  type ServiceDefinition,
} from "@grpc/grpc-js";

import { ObjectApiClient } from "@/lib/apollo/gen/apollostorage/grpc/object_api";

/**
 * The Apollo gRPC client factory for the BFF (task 2.2). Reads server-only
 * config — endpoint, bearer token, TLS trust — and builds a memoized
 * `ObjectApiClient`. The token/TLS never leave the server: they are injected
 * here as gRPC channel credentials + per-call `authorization` metadata, and are
 * read from `APOLLO_*` (never `NEXT_PUBLIC_*`). `import "server-only"` makes
 * importing this from a client component a build error.
 */

function requireEndpoint(): string {
  const endpoint = process.env.APOLLO_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "APOLLO_ENDPOINT is not set — the Apollo BFF cannot reach Apollo"
    );
  }
  return endpoint;
}

function channelCredentials(): ChannelCredentials {
  if (process.env.APOLLO_TLS_ENABLED !== "true") {
    // h2c / plaintext — matches Apollo when TLS is off (LAN).
    return credentials.createInsecure();
  }
  const ca = process.env.APOLLO_TLS_CA;
  if (!ca) return credentials.createSsl(); // system trust store
  // Accept either an inline PEM or a path to one.
  const pem = ca.includes("-----BEGIN")
    ? Buffer.from(ca)
    : readFileSync(ca);
  return credentials.createSsl(pem);
}

/**
 * Per-call metadata carrying the bearer token, when configured. Attached to
 * every call rather than composed into channel creds so it works over an
 * insecure (h2c) channel too — grpc-js forbids call-credentials on insecure
 * channels, but plain metadata is always allowed.
 */
export function authMetadata(): Metadata {
  const md = new Metadata();
  const token = process.env.APOLLO_TOKEN;
  if (token) md.set("authorization", `Bearer ${token}`);
  return md;
}

let objectApi: ObjectApiClient | null = null;

export function apollo(): ObjectApiClient {
  if (!objectApi) {
    objectApi = new ObjectApiClient(requireEndpoint(), channelCredentials());
  }
  return objectApi;
}

// ---------------------------------------------------------------------------
// Minimal grpc.health.v1.Health client (the health proto is standard and not
// in the Lexicon, so we hand-roll the two tiny messages rather than add a dep).
// HealthCheckRequest { string service = 1 }; HealthCheckResponse { enum status = 1 }.
// ---------------------------------------------------------------------------

export type HealthServingStatus =
  | "UNKNOWN"
  | "SERVING"
  | "NOT_SERVING"
  | "SERVICE_UNKNOWN";

const HEALTH_STATUS: HealthServingStatus[] = [
  "UNKNOWN",
  "SERVING",
  "NOT_SERVING",
  "SERVICE_UNKNOWN",
];

function encodeHealthRequest(service: string): Buffer {
  if (!service) return Buffer.alloc(0);
  const value = Buffer.from(service, "utf8");
  // field 1, wire type 2 (length-delimited): tag 0x0a, then varint length.
  return Buffer.concat([Buffer.from([0x0a, value.length]), value]);
}

function decodeHealthResponse(buf: Buffer): HealthServingStatus {
  // field 1, wire type 0 (varint): tag 0x08, then the enum value.
  if (buf.length >= 2 && buf[0] === 0x08) {
    return HEALTH_STATUS[buf[1]] ?? "UNKNOWN";
  }
  return "UNKNOWN";
}

const healthServiceDef: ServiceDefinition = {
  check: {
    path: "/grpc.health.v1.Health/Check",
    requestStream: false,
    responseStream: false,
    requestSerialize: (service: string) => encodeHealthRequest(service),
    requestDeserialize: (buf: Buffer) => buf,
    responseSerialize: (status: HealthServingStatus) =>
      Buffer.from([0x08, HEALTH_STATUS.indexOf(status)]),
    responseDeserialize: (buf: Buffer) => decodeHealthResponse(buf),
  },
};

interface HealthClient extends Client {
  check(
    service: string,
    metadata: Metadata,
    callback: (err: Error | null, status: HealthServingStatus) => void
  ): void;
}

const HealthCtor = makeGenericClientConstructor(
  healthServiceDef,
  "Health"
) as unknown as {
  new (
    address: string,
    creds: ChannelCredentials,
    options?: Partial<ClientOptions>
  ): HealthClient;
};

let healthClient: HealthClient | null = null;

export function health(): HealthClient {
  if (!healthClient) {
    healthClient = new HealthCtor(requireEndpoint(), channelCredentials());
  }
  return healthClient;
}
