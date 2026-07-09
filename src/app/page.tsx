import type { Metadata } from "next";

import { HealthDashboard } from "@/components/dashboard/health-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function Home() {
  return <HealthDashboard />;
}
