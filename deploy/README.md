# Deploy

Zeus ships its own Helm chart; Codex references it via Flux.

- `charts/zeus/` — the app's Helm chart: a `Deployment` (pinned to a Docker Hub
  image tag), a `ClusterIP` `Service`, and an `Ingress` exposed through **Traefik**
  with **cert-manager** TLS (`cert-manager.io/cluster-issuer` + a `tls` block).
- `flux/zeus-helmrelease.yaml` — a reference Flux `GitRepository` + `HelmRelease`
  that sources `charts/zeus` and pins the image tag. When Codex's Flux base is
  built (`design-codex-deployment`), this lives in the codex repo under `apps/`
  alongside the other services; bumping the tag in git rolls out via Flux.

## Local render / lint

```sh
helm lint deploy/charts/zeus
helm template zeus deploy/charts/zeus \
  --set image.repository=vezril/zeusui --set image.tag=0.1.0 \
  --set apollo.endpoint=apollo.apollo.svc.cluster.local:8443
```

## Config

Zeus is a Backend-for-Frontend, so its config splits between the browser and the
server tier (see `.env.example`):

- `apollo.apiBase` → `NEXT_PUBLIC_APOLLO_API_BASE` — the browser client selector
  (non-secret, same-origin `/api/apollo`); empty keeps the in-browser fixtures.
- `apollo.endpoint` → `APOLLO_ENDPOINT` — Apollo's gRPC surface (server-side).
  Apollo serves gRPC on **8443** (h2c by default).
- `apollo.tls.*` → `APOLLO_TLS_ENABLED` / `APOLLO_TLS_CA` — TLS trust (server-side).
- `apollo.token.secretName` → `APOLLO_TOKEN` from a Kubernetes **Secret** — the
  bearer token stays server-side, never plaintext and never `NEXT_PUBLIC_`.

The browser only ever talks to Zeus's `/api/apollo/*` routes; Apollo's endpoint,
token, and TLS trust never reach it.
