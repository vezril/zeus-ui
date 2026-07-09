/**
 * The typed Apollo client interface. A fixtures-backed implementation drives
 * development before a reachable Apollo exists (task 0.4); the live HTTP
 * implementation calls Zeus's own `/api/apollo/*` BFF routes and is selected by
 * the `NEXT_PUBLIC_APOLLO_API_BASE` env var in `index.ts` (task 7.1). Mirrors
 * the Muses client pattern, one layer deeper — the HTTP impl targets Zeus's
 * BFF, not Apollo directly (the browser never speaks gRPC).
 */
import type {
  BucketPage,
  HealthStatus,
  ListObjectsParams,
  ObjectMetadata,
  ObjectPage,
  PageParams,
  PutObjectInput,
  PutObjectResult,
} from "./types";

export interface ApolloClient {
  // --- Buckets ---

  /** GET /api/apollo/buckets — `ListBuckets`, keyset paged. */
  listBuckets(params?: PageParams): Promise<BucketPage>;

  /** POST /api/apollo/buckets — `CreateBucket`. Rejects on duplicate (409). */
  createBucket(bucket: string): Promise<void>;

  /**
   * DELETE /api/apollo/buckets/{bucket} — `DeleteBucket`. Not empty-checked and
   * does not cascade blobs; the caller confirms with the orphan warning.
   */
  deleteBucket(bucket: string): Promise<void>;

  // --- Objects ---

  /** GET /api/apollo/buckets/{bucket}/objects — `ListObjects(prefix)`, keyset paged. */
  listObjects(params: ListObjectsParams): Promise<ObjectPage>;

  /** HEAD /api/apollo/buckets/{bucket}/objects/{object} — `HeadObject`, no body. */
  headObject(bucket: string, object: string): Promise<ObjectMetadata>;

  /** DELETE /api/apollo/buckets/{bucket}/objects/{object} — `DeleteObject`. */
  deleteObject(bucket: string, object: string): Promise<void>;

  /**
   * POST /api/apollo/buckets/{bucket}/objects/{object} — `PutObject`. Streams
   * `body` through the BFF (header then chunks). `onProgress` receives an
   * upload fraction in [0, 1] when the transport supports it.
   */
  putObject(
    input: PutObjectInput,
    onProgress?: (fraction: number) => void
  ): Promise<PutObjectResult>;

  /**
   * A GET URL for an object's bytes (`GetObject` server-stream piped through the
   * BFF) — used as an `<img>`/download href, so it returns a string, not a fetch.
   */
  objectUrl(bucket: string, object: string): string;

  // --- Health (for the `/` dashboard tiles) ---

  /** GET /api/apollo/health — Apollo's `grpc.health.v1.Health` via the BFF. */
  checkHealth(): Promise<HealthStatus>;
}
