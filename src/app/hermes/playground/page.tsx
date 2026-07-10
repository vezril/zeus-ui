import type { Metadata } from "next";

import { Playground } from "@/components/hermes/playground";

export const metadata: Metadata = {
  title: "Playground · Hermes",
};

export default function HermesPlayground() {
  return <Playground />;
}
