/**
 * The Apollo surface Zeus consumes, as browser-facing DTOs. These mirror the
 * generated gRPC messages (src/lib/apollo/gen) but are decoupled: the Node BFF
 * (task 2) maps gRPC ⇄ these JSON DTOs, so the browser never imports the gRPC
 * runtime. `int64` fields (generation/size) are kept as **strings** — matching
 * the ts-proto `forceLong=string` stubs and staying JSON-safe over the BFF.
 */

/** Keyset pagination: `pageToken` is the last key of the previous page. */
export interface PageParams {
  pageToken?: string | null;
  pageSize?: number;
}

export interface BucketPage {
  buckets: string[];
  /** null when the end of results is reached. */
  nextPageToken: string | null;
}

export interface ListObjectsParams extends PageParams {
  bucket: string;
  /** S3-style "folder" prefix; empty lists the bucket root. */
  prefix?: string;
}

/** A row in a bucket listing (no body). */
export interface ObjectEntry {
  object: string;
  generation: string;
  size: string;
  contentType: string;
  crc32c: string;
  md5: string;
}

export interface ObjectPage {
  objects: ObjectEntry[];
  nextPageToken: string | null;
}

/** `HeadObject` result — the metadata drawer's source, no body fetch. */
export interface ObjectMetadata {
  bucket: string;
  object: string;
  contentType: string;
  size: string;
  crc32c: string;
  md5: string;
  generation: string;
}

/** Upload input; `body` is streamed through the BFF to `PutObject`. */
export interface PutObjectInput {
  bucket: string;
  object: string;
  contentType: string;
  body: Blob;
}

/** `PutObject` result — the server-computed checksums Zeus displays (v1). */
export interface PutObjectResult {
  generation: string;
  crc32c: string;
  md5: string;
  size: string;
}

/** Standard `grpc.health.v1.Health` serving state, for the dashboard tiles. */
export type HealthStatus = "SERVING" | "NOT_SERVING" | "UNKNOWN";
