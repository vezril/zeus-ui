"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getClient } from "@/lib/apollo";
import type { BucketPage, ObjectPage } from "@/lib/apollo";

export const BUCKETS_PAGE_SIZE = 50;

export const bucketsQueryKey = ["buckets"] as const;

/** Keyset (page_token) infinite scroll over the bucket list. */
export function useInfiniteBuckets() {
  return useInfiniteQuery({
    queryKey: bucketsQueryKey,
    queryFn: ({ pageParam }) =>
      getClient().listBuckets({
        pageToken: pageParam,
        pageSize: BUCKETS_PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last: BucketPage) => last.nextPageToken,
  });
}

export function useCreateBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => getClient().createBucket(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: bucketsQueryKey }),
  });
}

export function useDeleteBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => getClient().deleteBucket(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: bucketsQueryKey }),
  });
}

/**
 * The bucket's current object count for the delete confirmation. There is no
 * count RPC, so this reads one large page of ListObjects; if a next page
 * remains the count is reported as a lower bound ("at least").
 */
export function useBucketObjectCount(bucket: string, enabled: boolean) {
  return useQuery({
    queryKey: ["bucket-object-count", bucket],
    enabled,
    queryFn: async (): Promise<{ count: number; atLeast: boolean }> => {
      const page: ObjectPage = await getClient().listObjects({
        bucket,
        pageSize: 1000,
      });
      return { count: page.objects.length, atLeast: page.nextPageToken !== null };
    },
  });
}
