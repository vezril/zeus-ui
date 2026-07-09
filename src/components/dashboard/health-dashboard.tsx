"use client";

import { useQuery } from "@tanstack/react-query";

import { getClient } from "@/lib/apollo";
import { SERVICES } from "@/lib/services";
import { HealthTile, type TileState } from "./health-tile";

/**
 * The `/` service-health dashboard (task 1.2). One tile per constellation
 * service. Apollo's tile reflects its `grpc.health.v1.Health` status fetched
 * through the BFF (auth-exempt) — SERVING when up, NOT_SERVING when it reports
 * down or is unreachable. Future services render as disabled "coming soon"
 * tiles until their module ships.
 */
export function HealthDashboard() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Service health across the constellation.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) =>
          service.status === "active" ? (
            <ActiveServiceTile key={service.key} service={service} />
          ) : (
            <HealthTile
              key={service.key}
              name={service.name}
              blurb={service.blurb}
              icon={service.icon}
              state={{ kind: "coming-soon" }}
            />
          )
        )}
      </div>
    </div>
  );
}

function ActiveServiceTile({
  service,
}: {
  service: (typeof SERVICES)[number];
}) {
  const query = useQuery({
    queryKey: ["health", service.key],
    // Only Apollo is active in v1; its client exposes checkHealth() (→ BFF).
    queryFn: () => getClient().checkHealth(),
    // Health should feel live: revalidate periodically and on reconnect.
    refetchInterval: 15_000,
    retry: false,
  });

  const state: TileState = query.isLoading
    ? { kind: "loading" }
    : // Unreachable/errored reads as down, per the spec.
      { kind: "health", status: query.data ?? "NOT_SERVING" };

  return (
    <HealthTile
      name={service.name}
      blurb={service.blurb}
      icon={service.icon}
      href={service.href}
      state={state}
    />
  );
}
