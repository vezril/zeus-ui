"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getHermesClient } from "@/lib/hermes";
import type { Labels } from "@/lib/hermes";

export const topicsQueryKey = ["hermes", "topics"] as const;

/** List topics (id + published count). The Hermes listing is not paginated. */
export function useTopics() {
  return useQuery({
    queryKey: topicsQueryKey,
    queryFn: () => getHermesClient().listTopics(),
  });
}

/** A single topic's labels (fetched on demand for the edit view). */
export function useTopic(topicId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["hermes", "topic", topicId],
    enabled: enabled && topicId !== null,
    queryFn: () => getHermesClient().getTopic(topicId!),
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, labels }: { topicId: string; labels?: Labels }) =>
      getHermesClient().createTopic(topicId, labels),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicsQueryKey }),
  });
}

export function useUpdateLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, labels }: { topicId: string; labels: Labels }) =>
      getHermesClient().updateLabels(topicId, labels),
    onSuccess: (_data, { topicId }) => {
      qc.invalidateQueries({ queryKey: topicsQueryKey });
      qc.invalidateQueries({ queryKey: ["hermes", "topic", topicId] });
    },
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => getHermesClient().deleteTopic(topicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicsQueryKey }),
  });
}
