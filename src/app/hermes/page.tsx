import type { Metadata } from "next";

import { TopicManager } from "@/components/hermes/topic-manager";

export const metadata: Metadata = {
  title: "Hermes",
};

export default function HermesHome() {
  return <TopicManager />;
}
