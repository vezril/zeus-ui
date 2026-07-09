import { NextRequest, NextResponse } from "next/server";

import { apollo, authMetadata } from "@/lib/apollo/server/client";
import {
  errorResponse,
  grpcUnary,
  toObjectMetadata,
  toPutObjectResult,
} from "@/lib/apollo/server/grpc";
import type {
  DeleteObjectResponse,
  ObjectMetadata as GrpcObjectMetadata,
  PutObjectResponse,
} from "@/lib/apollo/gen/apollostorage/grpc/object_api";

export const runtime = "nodejs";

type Params = { params: Promise<{ bucket: string; key: string[] }> };

/**
 * GET /api/apollo/buckets/{bucket}/objects/{key}
 *   ?head=1 → HeadObject metadata as JSON (no body fetch)
 *   otherwise → GetObject bytes, streamed through the BFF (no whole-file buffer)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { bucket, key } = await params;
    const object = key.join("/");

    if (req.nextUrl.searchParams.get("head") === "1") {
      const meta = await grpcUnary<GrpcObjectMetadata>((cb) =>
        apollo().headObject({ bucket, object }, authMetadata(), cb)
      );
      return NextResponse.json(toObjectMetadata(meta));
    }

    return await downloadObject(bucket, object);
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * POST /api/apollo/buckets/{bucket}/objects/{key} — PutObject. Streams the
 * request body into the client-stream (header first, then chunks), applying
 * backpressure so nothing is buffered wholly in memory.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { bucket, key } = await params;
    const object = key.join("/");
    const contentType =
      req.headers.get("content-type") || "application/octet-stream";
    const result = await uploadObject(bucket, object, contentType, req.body);
    return NextResponse.json(toPutObjectResult(result), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE /api/apollo/buckets/{bucket}/objects/{key} — DeleteObject. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { bucket, key } = await params;
    const object = key.join("/");
    await grpcUnary<DeleteObjectResponse>((cb) =>
      apollo().deleteObject({ bucket, object }, authMetadata(), cb)
    );
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}

// ---------------------------------------------------------------------------
// Streaming helpers
// ---------------------------------------------------------------------------

/**
 * Open the GetObject server-stream, read its leading `header` message for
 * content-type/length, then return a Response whose body streams the remaining
 * `chunk` messages. The stream is paused between the header and body wiring so
 * no chunks are lost or buffered.
 */
async function downloadObject(
  bucket: string,
  object: string
): Promise<Response> {
  const call = apollo().getObject({ bucket, object }, authMetadata());

  const header = await new Promise<GrpcObjectMetadata | undefined>(
    (resolve, reject) => {
      const onData = (msg: { header?: GrpcObjectMetadata }) => {
        call.pause();
        cleanup();
        resolve(msg.header);
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onEnd = () => {
        cleanup();
        resolve(undefined);
      };
      function cleanup() {
        call.removeListener("data", onData);
        call.removeListener("error", onError);
        call.removeListener("end", onEnd);
      }
      call.on("data", onData);
      call.on("error", onError);
      call.on("end", onEnd);
    }
  );

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      call.on("data", (msg: { chunk?: Buffer }) => {
        if (msg.chunk && msg.chunk.length) {
          controller.enqueue(new Uint8Array(msg.chunk));
        }
      });
      call.on("end", () => controller.close());
      call.on("error", (err: Error) => controller.error(err));
      call.resume();
    },
    cancel() {
      call.cancel();
    },
  });

  const headers = new Headers();
  headers.set("content-type", header?.contentType || "application/octet-stream");
  if (header?.size) headers.set("content-length", header.size);
  return new Response(body, { headers });
}

/**
 * Feed the request body into the PutObject client-stream: a `header` message
 * first, then `chunk` messages pulled from the body with backpressure.
 */
function uploadObject(
  bucket: string,
  object: string,
  contentType: string,
  body: ReadableStream<Uint8Array> | null
): Promise<PutObjectResponse> {
  return new Promise((resolve, reject) => {
    const call = apollo().putObject(authMetadata(), (err, res) =>
      err ? reject(err) : resolve(res)
    );

    // v1 sends no expected_* checksums (Apollo computes + returns them).
    call.write({
      header: {
        bucket,
        object,
        contentType,
        expectedCrc32c: "",
        expectedMd5: "",
      },
    });

    if (!body) {
      call.end();
      return;
    }

    const reader = body.getReader();
    const pump = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          call.end();
          return;
        }
        const canContinue = call.write({ chunk: Buffer.from(value) });
        if (canContinue) {
          pump();
        } else {
          call.once("drain", pump);
        }
      }, reject);
    };
    pump();
  });
}
