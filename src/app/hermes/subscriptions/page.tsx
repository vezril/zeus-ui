import type { Metadata } from "next";

import { SubscriptionManager } from "@/components/hermes/subscription-manager";

export const metadata: Metadata = {
  title: "Subscriptions · Hermes",
};

export default function HermesSubscriptions() {
  return <SubscriptionManager />;
}
