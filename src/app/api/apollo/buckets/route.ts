import { NextRequest, NextResponse } from "next/server";

import { apollo, authMetadata } from "@/lib/apollo/server/client";
import {
  errorResponse,
  grpcUnary,
  toBucketPage,
} from "@/lib/apollo/server/grpc";
import type {
  BucketResponse,
  ListBucketsResponse,
} from "@/lib/apollo/gen/apollostorage/grpc/object_api";

// grpc-js runs on Node's http2 — never the edge runtime.
export const runtime = "nodejs";

/** GET /api/apollo/buckets — ListBuckets (keyset paged). */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const res = await grpcUnary<ListBucketsResponse>((cb) =>
      apollo().listBuckets(
        {
          pageSize: Number(sp.get("pageSize") ?? 0) || 0,
          pageToken: sp.get("pageToken") ?? "",
        },
        authMetadata(),
        cb
      )
    );
    return NextResponse.json(toBucketPage(res));
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST /api/apollo/buckets — CreateBucket. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { bucket?: unknown };
    if (typeof body.bucket !== "string" || !body.bucket) {
      return NextResponse.json(
        { error: "bucket name is required" },
        { status: 400 }
      );
    }
    const bucket = body.bucket;
    await grpcUnary<BucketResponse>((cb) =>
      apollo().createBucket({ bucket }, authMetadata(), cb)
    );
    return NextResponse.json({ bucket }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
