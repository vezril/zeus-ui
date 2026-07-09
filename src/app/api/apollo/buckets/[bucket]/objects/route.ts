import { NextRequest, NextResponse } from "next/server";

import { apollo, authMetadata } from "@/lib/apollo/server/client";
import {
  errorResponse,
  grpcUnary,
  toObjectPage,
} from "@/lib/apollo/server/grpc";
import type { ListObjectsResponse } from "@/lib/apollo/gen/apollostorage/grpc/object_api";

export const runtime = "nodejs";

/** GET /api/apollo/buckets/{bucket}/objects — ListObjects(prefix), keyset paged. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bucket: string }> }
) {
  try {
    const { bucket } = await params;
    const sp = req.nextUrl.searchParams;
    const res = await grpcUnary<ListObjectsResponse>((cb) =>
      apollo().listObjects(
        {
          bucket,
          prefix: sp.get("prefix") ?? "",
          pageSize: Number(sp.get("pageSize") ?? 0) || 0,
          pageToken: sp.get("pageToken") ?? "",
        },
        authMetadata(),
        cb
      )
    );
    return NextResponse.json(toObjectPage(res));
  } catch (e) {
    return errorResponse(e);
  }
}
