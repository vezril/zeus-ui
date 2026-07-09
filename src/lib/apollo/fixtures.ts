/**
 * In-memory fixtures ApolloClient — drives the UI before a reachable Apollo
 * exists. Seed data is deterministic (fixed values, no Date/Math.random at load)
 * so server and client render identical markup — no hydration drift. Mutations
 * (create/put/delete) run client-side after hydration and mutate this store.
 * Replaced by the live BFF-backed HTTP client via the env selector in index.ts.
 */
import type { ApolloClient } from "./client";
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

// ---------------------------------------------------------------------------
// Deterministic fake checksums (fixtures only — not real crc32c/md5)
// ---------------------------------------------------------------------------

/** FNV-1a over a string → 32-bit unsigned. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hex(n: number, width: number): string {
  return (n >>> 0).toString(16).padStart(8, "0").repeat(Math.ceil(width / 8)).slice(0, width);
}

/** Stable pseudo-checksums derived from the object identity + size. */
function fakeChecksums(seed: string): { crc32c: string; md5: string } {
  const a = fnv1a(seed);
  return { crc32c: hex(a, 8), md5: hex(a, 16) + hex(fnv1a(seed + "#"), 16) };
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

interface StoredObject {
  object: string;
  contentType: string;
  size: string;
  generation: string;
  crc32c: string;
  md5: string;
}

function seedObject(object: string, contentType: string, size: number): StoredObject {
  return {
    object,
    contentType,
    size: String(size),
    generation: "1",
    ...fakeChecksums(`${object}:${size}`),
  };
}

/** bucket name → (object key → object). Insertion order is not relied upon. */
const store = new Map<string, Map<string, StoredObject>>();

function seedBucket(bucket: string, objects: StoredObject[]): void {
  store.set(bucket, new Map(objects.map((o) => [o.object, o])));
}

seedBucket("media-thumbnails", [
  seedObject("photos/2026/07/dive-log.jpg", "image/jpeg", 482113),
  seedObject("photos/2026/07/reef.jpg", "image/jpeg", 913840),
  seedObject("photos/2026/06/sunset.jpg", "image/jpeg", 655214),
  seedObject("avatars/user-01.png", "image/png", 20481),
]);
seedBucket("ingest-staging", [
  seedObject("uploads/pending/clip-0001.mp4", "video/mp4", 18446744),
  seedObject("uploads/pending/notes.txt", "text/plain", 1204),
]);
seedBucket("backups", []);

// Monotonic generation for new writes (fixed base — deterministic across a run).
let nextGeneration = 1000;

// ---------------------------------------------------------------------------
// Keyset pagination helper
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 50;

/** Sort by key, return the window after `pageToken`, plus the next token. */
function page<T>(
  items: T[],
  keyOf: (item: T) => string,
  params: PageParams | undefined
): { window: T[]; nextPageToken: string | null } {
  const sorted = [...items].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  const start = params?.pageToken
    ? sorted.findIndex((i) => keyOf(i) > params.pageToken!)
    : 0;
  const from = start === -1 ? sorted.length : start;
  const size = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const window = sorted.slice(from, from + size);
  const last = window[window.length - 1];
  const nextPageToken =
    last && from + size < sorted.length ? keyOf(last) : null;
  return { window, nextPageToken };
}

function requireBucket(bucket: string): Map<string, StoredObject> {
  const b = store.get(bucket);
  if (!b) throw new Error(`Apollo 404: bucket "${bucket}" not found`);
  return b;
}

// ---------------------------------------------------------------------------
// Fixtures client
// ---------------------------------------------------------------------------

export function fixtureClient(): ApolloClient {
  return {
    async listBuckets(params?: PageParams): Promise<BucketPage> {
      const { window, nextPageToken } = page(
        [...store.keys()],
        (name) => name,
        params
      );
      return { buckets: window, nextPageToken };
    },

    async createBucket(bucket: string): Promise<void> {
      if (store.has(bucket)) throw new Error(`Apollo 409: bucket "${bucket}" already exists`);
      store.set(bucket, new Map());
    },

    async deleteBucket(bucket: string): Promise<void> {
      requireBucket(bucket);
      store.delete(bucket);
    },

    async listObjects(params: ListObjectsParams): Promise<ObjectPage> {
      const bucket = requireBucket(params.bucket);
      const prefix = params.prefix ?? "";
      const matching = [...bucket.values()].filter((o) =>
        o.object.startsWith(prefix)
      );
      const { window, nextPageToken } = page(matching, (o) => o.object, params);
      return {
        objects: window.map((o) => ({
          object: o.object,
          generation: o.generation,
          size: o.size,
          contentType: o.contentType,
          crc32c: o.crc32c,
          md5: o.md5,
        })),
        nextPageToken,
      };
    },

    async headObject(bucket: string, object: string): Promise<ObjectMetadata> {
      const o = requireBucket(bucket).get(object);
      if (!o) throw new Error(`Apollo 404: object "${object}" not found`);
      return {
        bucket,
        object: o.object,
        contentType: o.contentType,
        size: o.size,
        crc32c: o.crc32c,
        md5: o.md5,
        generation: o.generation,
      };
    },

    async deleteObject(bucket: string, object: string): Promise<void> {
      requireBucket(bucket).delete(object);
    },

    async putObject(
      input: PutObjectInput,
      onProgress?: (fraction: number) => void
    ): Promise<PutObjectResult> {
      const bucket = requireBucket(input.bucket);
      const size = input.body.size;
      onProgress?.(1);
      const generation = String(nextGeneration++);
      const stored: StoredObject = {
        object: input.object,
        contentType: input.contentType,
        size: String(size),
        generation,
        ...fakeChecksums(`${input.object}:${size}:${generation}`),
      };
      bucket.set(input.object, stored);
      return {
        generation,
        crc32c: stored.crc32c,
        md5: stored.md5,
        size: stored.size,
      };
    },

    objectUrl(bucket: string, object: string): string {
      // Uniform with the HTTP impl so UI code is impl-agnostic; fixtures have no
      // real bytes to serve, so this href won't resolve during offline dev.
      return `/api/apollo/buckets/${encodeURIComponent(bucket)}/objects/${object
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;
    },

    async checkHealth(): Promise<HealthStatus> {
      return "SERVING";
    },
  };
}
