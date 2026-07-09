import "server-only";

import { NextResponse } from "next/server";
import { status as GrpcStatus, type ServiceError } from "@grpc/grpc-js";

import type {
  BucketPage,
  ObjectMetadata,
  ObjectPage,
  PutObjectResult,
} from "@/lib/apollo/types";
import type {
  ListBucketsResponse,
  ListObjectsResponse,
  ObjectMetadata as GrpcObjectMetadata,
  PutObjectResponse,
} from "@/lib/apollo/gen/apollostorage/grpc/object_api";

// ---------------------------------------------------------------------------
// gRPC status → HTTP (task 2.3)
// ---------------------------------------------------------------------------

const STATUS_TO_HTTP: Partial<Record<GrpcStatus, number>> = {
  [GrpcStatus.ALREADY_EXISTS]: 409,
  [GrpcStatus.INVALID_ARGUMENT]: 400,
  [GrpcStatus.FAILED_PRECONDITION]: 412,
  [GrpcStatus.NOT_FOUND]: 404,
  // Zeus's APOLLO_TOKEN wrong/absent is an ops misconfig, not a user error.
  [GrpcStatus.UNAUTHENTICATED]: 502,
  // Apollo unreachable → upstream unavailable (bad gateway family).
  [GrpcStatus.UNAVAILABLE]: 503,
};

export function grpcStatusToHttp(code: GrpcStatus | undefined): number {
  return (code !== undefined && STATUS_TO_HTTP[code]) || 500;
}

function isServiceError(e: unknown): e is ServiceError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "number"
  );
}

/** Translate any thrown gRPC/other error into a JSON HTTP response. */
export function errorResponse(e: unknown): NextResponse {
  if (isServiceError(e)) {
    const httpStatus = grpcStatusToHttp(e.code);
    return NextResponse.json(
      { error: e.details || e.message, grpcCode: e.code },
      { status: httpStatus }
    );
  }
  const message = e instanceof Error ? e.message : "Unknown BFF error";
  return NextResponse.json({ error: message }, { status: 500 });
}

// ---------------------------------------------------------------------------
// Unary call → Promise
// ---------------------------------------------------------------------------

/**
 * Promisify a unary gRPC call. Pass a thunk that invokes the client method with
 * the node-style callback, e.g.
 *   grpcUnary<BucketResponse>((cb) => apollo().createBucket(req, authMetadata(), cb))
 */
export function grpcUnary<Res>(
  run: (cb: (err: ServiceError | null, res: Res) => void) => void
): Promise<Res> {
  return new Promise((resolve, reject) => {
    run((err, res) => (err ? reject(err) : resolve(res)));
  });
}

// ---------------------------------------------------------------------------
// gRPC message → browser DTO mappers (field names already align; coerce the
// empty-string "no more pages" token to null).
// ---------------------------------------------------------------------------

export function toBucketPage(res: ListBucketsResponse): BucketPage {
  return {
    buckets: res.buckets,
    nextPageToken: res.nextPageToken || null,
  };
}

export function toObjectPage(res: ListObjectsResponse): ObjectPage {
  return {
    objects: res.objects.map((o) => ({
      object: o.object,
      generation: o.generation,
      size: o.size,
      contentType: o.contentType,
      crc32c: o.crc32c,
      md5: o.md5,
    })),
    nextPageToken: res.nextPageToken || null,
  };
}

export function toObjectMetadata(m: GrpcObjectMetadata): ObjectMetadata {
  return {
    bucket: m.bucket,
    object: m.object,
    contentType: m.contentType,
    size: m.size,
    crc32c: m.crc32c,
    md5: m.md5,
    generation: m.generation,
  };
}

export function toPutObjectResult(res: PutObjectResponse): PutObjectResult {
  return {
    generation: res.generation,
    crc32c: res.crc32c,
    md5: res.md5,
    size: res.size,
  };
}
