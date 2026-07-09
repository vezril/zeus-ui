/**
 * Live HTTP implementation of the Apollo client. It calls Zeus's own
 * `/api/apollo/*` BFF routes (the Node-runtime gRPC bridge, task 2) — never
 * Apollo directly, so the browser holds no gRPC runtime, endpoint, or token.
 * Selected by the `NEXT_PUBLIC_APOLLO_API_BASE` env var in `index.ts`. The BFF
 * routes are not live until task 2; this is the seam that swaps in at task 7.1.
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

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apollo ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function expectOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apollo ${res.status} ${res.statusText}: ${body}`);
  }
}

/** Encode an object key, preserving the `/` prefix separators. */
function encodeKey(object: string): string {
  return object.split("/").map(encodeURIComponent).join("/");
}

export function httpClient(base: string): ApolloClient {
  const root = base.replace(/\/$/, "");
  const url = (path: string) => `${root}${path}`;
  const bucketPath = (b: string) => `/buckets/${encodeURIComponent(b)}`;
  const objectPath = (b: string, o: string) =>
    `${bucketPath(b)}/objects/${encodeKey(o)}`;

  return {
    async listBuckets(params?: PageParams): Promise<BucketPage> {
      const q = new URLSearchParams();
      if (params?.pageToken) q.set("pageToken", params.pageToken);
      if (params?.pageSize) q.set("pageSize", String(params.pageSize));
      const qs = q.toString();
      return json(await fetch(url(`/buckets${qs ? `?${qs}` : ""}`)));
    },

    async createBucket(bucket: string): Promise<void> {
      await expectOk(
        await fetch(url(`/buckets`), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bucket }),
        })
      );
    },

    async deleteBucket(bucket: string): Promise<void> {
      await expectOk(
        await fetch(url(bucketPath(bucket)), { method: "DELETE" })
      );
    },

    async listObjects(params: ListObjectsParams): Promise<ObjectPage> {
      const q = new URLSearchParams();
      if (params.prefix) q.set("prefix", params.prefix);
      if (params.pageToken) q.set("pageToken", params.pageToken);
      if (params.pageSize) q.set("pageSize", String(params.pageSize));
      const qs = q.toString();
      return json(
        await fetch(url(`${bucketPath(params.bucket)}/objects${qs ? `?${qs}` : ""}`))
      );
    },

    async headObject(bucket: string, object: string): Promise<ObjectMetadata> {
      // HEAD carries no body; the BFF returns the metadata as response headers,
      // so a metadata GET variant is used here for a JSON payload.
      return json(await fetch(url(`${objectPath(bucket, object)}?head=1`)));
    },

    async deleteObject(bucket: string, object: string): Promise<void> {
      await expectOk(
        await fetch(url(objectPath(bucket, object)), { method: "DELETE" })
      );
    },

    putObject(
      input: PutObjectInput,
      onProgress?: (fraction: number) => void
    ): Promise<PutObjectResult> {
      // XHR (not fetch) so the browser reports real upload progress; the BFF
      // still streams the received body chunk-by-chunk into PutObject.
      return new Promise<PutObjectResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url(objectPath(input.bucket, input.object)));
        xhr.setRequestHeader("content-type", input.contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress?.(e.loaded / e.total);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(1);
            try {
              resolve(JSON.parse(xhr.responseText) as PutObjectResult);
            } catch {
              reject(new Error("Apollo: malformed upload response"));
            }
          } else {
            reject(
              new Error(
                `Apollo ${xhr.status} ${xhr.statusText}: ${xhr.responseText}`
              )
            );
          }
        };
        xhr.onerror = () => reject(new Error("Apollo: upload network error"));
        onProgress?.(0);
        xhr.send(input.body);
      });
    },

    objectUrl(bucket: string, object: string): string {
      return url(objectPath(bucket, object));
    },

    async checkHealth(): Promise<HealthStatus> {
      return json(await fetch(url(`/health`)));
    },
  };
}
