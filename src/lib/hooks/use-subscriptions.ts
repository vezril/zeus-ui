"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getHermesClient } from "@/lib/hermes";

export const subscriptionsQueryKey = ["hermes", "subscriptions"] as const;

/** List subscriptions with queue-health stats (an eventually-consistent projection). */
export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionsQueryKey,
    queryFn: () => getHermesClient().listSubscriptions(),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      subscriptionId,
      topicId,
    }: {
      subscriptionId: string;
      topicId: string;
    }) => getHermesClient().createSubscription(subscriptionId, topicId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: subscriptionsQueryKey }),
  });
}
