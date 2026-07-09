import type { Metadata } from "next";

import { BucketManager } from "@/components/apollo/bucket-manager";

export const metadata: Metadata = {
  title: "Apollo",
};

export default function ApolloHome() {
  return <BucketManager />;
}
