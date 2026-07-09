import { NextResponse } from "next/server";

import { apollo, authMetadata } from "@/lib/apollo/server/client";
import { errorResponse, grpcUnary } from "@/lib/apollo/server/grpc";
import type { BucketResponse } from "@/lib/apollo/gen/apollostorage/grpc/object_api";

export const runtime = "nodejs";

/**
 * DELETE /api/apollo/buckets/{bucket} — DeleteBucket. Not empty-checked and
 * does not cascade blobs (the UI confirms with an orphan warning); the BFF just
 * forwards the call.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket } = await params;
    await grpcUnary<BucketResponse>((cb) =>
      apollo().deleteBucket({ bucket }, authMetadata(), cb)
    );
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
