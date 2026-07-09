# Change: design-zeus-ui

> **Design capture + v1 buildout plan.** Records the v1 design for **Zeus**, the constellation's
> Next.js operator/admin console, and its first module (**Apollo**). Full design in `design.md`.

## Why

Every service in the constellation is gRPC/backend — there is no human-facing way to *operate*
Apollo: create a bucket, upload a file, inspect metadata, delete something. Zeus is that console. It
deliberately differs from Muses (the public gallery): Zeus is for management, spans services, and —
because Apollo is gRPC-only with streaming RPCs — must introduce a thin server tier the browser-only
Muses never needed. Capturing the v1 shape now lets Zeus and its Apollo dependency be built without
drift, and establishes the multi-service pattern the later modules slot into.

## Direction (decided in exploration)

| Decision | Choice |
|----------|--------|
| Purpose | **Operator/admin console** (manage, not browse); **Apollo module first**, multi-service layout from day one |
| Browser → Apollo | **Next.js BFF** (Node-runtime route handlers + `@grpc/grpc-js`). Rejected grpc-web+Envoy (no client-streaming → upload impossible) and a standalone Scala gateway (too heavy for admin) |
| Secret boundary | Apollo bearer token + TLS trust **server-side only** (`APOLLO_TOKEN`, never `NEXT_PUBLIC_*`); browser talks only to Zeus's `/api/apollo/*` |
| Client pattern | typed `ApolloClient` iface + **fixtures by default** + http impl → Zeus's own BFF routes (mirrors Muses) |
| Eventual consistency | **visible syncing**: optimistic insert + per-item "syncing" badge + `HeadObject` confirm |
| Destructive actions | **confirmation modals** (type-to-confirm bucket delete; object-count + orphan warning since DeleteBucket isn't empty-checked and doesn't cascade blobs) |
| Pagination | keyset (`page_token`) → **infinite scroll** |
| Contracts | TS gRPC stubs generated **in Zeus** from the Lexicon `.proto` (single source preserved); defer an npm artifact until a 2nd TS consumer |
| Stack | same as Muses (Next 15 · React 19 · Tailwind v4 · Radix · TanStack Query · …) **+ `@grpc/grpc-js`** |
| Auth | **none in v1** (LAN-only, single-user); the UI is the only guardrail |

## What Changes

- **app-shell** (new): dark operator-console theme, responsive layout, top nav, and the `/`
  **service-health dashboard** (tiles via Apollo's auth-exempt `grpc.health.v1.Health`).
- **apollo-bridge** (new): the **Next.js BFF** — Node-runtime route handlers holding a `@grpc/grpc-js`
  client; server-side token/TLS injection; gRPC-status→HTTP mapping; streaming upload/download plumbing.
- **bucket-management** (new): list buckets (keyset infinite scroll), create bucket (client-side name
  validation mirroring Apollo's rules), delete bucket (type-to-confirm + object-count + orphan warning).
- **object-browser** (new): S3-style prefix "folder" navigation, list objects (paged), metadata drawer
  (`HeadObject`), object download / image preview (`GetObject` stream), delete object (confirm).
- **object-upload** (new): drag-and-drop upload **streamed through the BFF** (`PutObject`), progress,
  content-type detection, visible-syncing optimistic insert, and display of the returned checksums.
- **api-client** (new): the typed `ApolloClient` + fixtures (dev before Apollo is reachable) + the
  env-selected live http impl.

## Impact

- Affected specs: the six capabilities above are **ADDED** (greenfield UI).
- Dependency — the **Apollo `ObjectApi` gRPC contract** (`apollostorage/grpc/object_api.proto` in the
  Lexicon), consumed as generated **TypeScript stubs**, plus Apollo's `grpc.health.v1.Health` for the
  dashboard tiles. Reads Apollo specs `object-api`, `domain-model`, `api-security` (documented in
  `design.md`). First **TypeScript** consumer of the Lexicon.
- Repo: new Next.js app in `zeus-ui`, its own Docker image → Docker Hub, deployed by Codex behind
  Traefik + cert-manager TLS (see `design-codex-deployment`).
- Out of scope: the other service modules (Hermes/Artemis/… panels) — **added later one service at a
  time, each as its own OpenSpec change**; v1 ships only Apollo plus **disabled "coming soon" nav
  stubs** so the multi-service shape is visible without anything half-built shipping. Also out of
  scope: multi-user auth/permissions, browser-side checksum computation, and publishing a Lexicon npm
  TS artifact.
