"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getHermesClient } from "@/lib/hermes";
import type { DeadLetter } from "@/lib/hermes";

export const dlqQueryKey = ["hermes", "dlq"] as const;

/** The dead-letter triage view (a leased batch; not a stable snapshot). */
export function useDeadLetters() {
  return useQuery({
    queryKey: dlqQueryKey,
    queryFn: () => getHermesClient().listDeadLetters(),
  });
}

export function useReplayDeadLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: DeadLetter) =>
      getHermesClient().replayDeadLetter(message),
    onSuccess: () => qc.invalidateQueries({ queryKey: dlqQueryKey }),
  });
}

export function useDiscardDeadLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ackId: string) => getHermesClient().discardDeadLetter(ackId),
    onSuccess: () => qc.invalidateQueries({ queryKey: dlqQueryKey }),
  });
}
