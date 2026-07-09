"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getClient } from "@/lib/apollo";
import type { ObjectPage } from "@/lib/apollo";

export const OBJECTS_PAGE_SIZE = 100;

export function objectsQueryKey(bucket: string, prefix: string) {
  return ["objects", bucket, prefix] as const;
}

/** Keyset (page_token) infinite scroll over a bucket's objects under a prefix. */
export function useInfiniteObjects(bucket: string, prefix: string) {
  return useInfiniteQuery({
    queryKey: objectsQueryKey(bucket, prefix),
    queryFn: ({ pageParam }) =>
      getClient().listObjects({
        bucket,
        prefix,
        pageToken: pageParam,
        pageSize: OBJECTS_PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: ObjectPage) => last.nextPageToken,
  });
}

/** HeadObject for the metadata drawer — no payload transferred. */
export function useObjectMetadata(
  bucket: string,
  object: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["object-meta", bucket, object],
    enabled: enabled && object !== null,
    queryFn: () => getClient().headObject(bucket, object!),
  });
}

export function useDeleteObject(bucket: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (object: string) => getClient().deleteObject(bucket, object),
    // Invalidate every prefix listing for this bucket (partial-key match).
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["objects", bucket] }),
  });
}
