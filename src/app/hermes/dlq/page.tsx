import type { Metadata } from "next";

import { DlqManager } from "@/components/hermes/dlq-manager";

export const metadata: Metadata = {
  title: "Dead-letters · Hermes",
};

export default function HermesDlq() {
  return <DlqManager />;
}
