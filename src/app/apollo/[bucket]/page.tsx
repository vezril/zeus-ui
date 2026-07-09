import type { Metadata } from "next";

import { ObjectBrowser } from "@/components/apollo/object-browser";

export const metadata: Metadata = {
  title: "Bucket",
};

export default async function BucketPage({
  params,
}: {
  params: Promise<{ bucket: string }>;
}) {
  const { bucket } = await params;
  return <ObjectBrowser bucket={decodeURIComponent(bucket)} />;
}
