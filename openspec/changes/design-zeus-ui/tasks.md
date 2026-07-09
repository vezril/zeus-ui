# Tasks: design-zeus-ui (v1)

Buildout sequence. Since a reachable Apollo isn't assumed during development, build against the typed
`ApolloClient` backed by fixtures, then swap to the live BFF-fronted endpoints (task 7). The BFF
(task 2) is the load-bearing piece that distinguishes Zeus from Muses — sequence it early.

## 0. Scaffold

- [x] 0.1 Next.js 15 (App Router) + TypeScript + Tailwind v4 + Radix + TanStack Query (match Muses)
- [x] 0.2 Dark operator-console theme tokens; `output: 'standalone'`; Dockerfile → Docker Hub + CI (sibling-repo pattern)
- [x] 0.3 Generate TS gRPC stubs from the Lexicon `apollostorage/grpc/object_api.proto` (buf/ts-proto; proto sourced from the Lexicon, not forked)
- [x] 0.4 Typed `ApolloClient` interface + fixtures/mocks + env-selected http impl (`getClient()`, mirrors Muses `src/lib/api`)

## 1. App shell + dashboard

- [x] 1.1 Dark, low-chrome layout; top nav; multi-service route groups (`/`, `/apollo/**`, stubs for later)
- [x] 1.2 `/` service-health dashboard: tiles fed by Apollo's `grpc.health.v1.Health` (auth-exempt) via the BFF
- [x] 1.3 Responsive (sidebar → sheet on mobile), matching Muses' breakpoints
- [x] 1.4 Disabled "coming soon" nav stubs for future modules (Hermes, Artemis, …) — visible, not built

## 2. Apollo BFF bridge (the gRPC boundary)

- [x] 2.1 Node-runtime route handlers under `/api/apollo/*` (`export const runtime = 'nodejs'`)
- [x] 2.2 `@grpc/grpc-js` client factory: `APOLLO_ENDPOINT` + server-side `APOLLO_TOKEN` (bearer metadata) + `APOLLO_TLS_*`
- [x] 2.3 gRPC-status → HTTP mapping (ALREADY_EXISTS→409, INVALID_ARGUMENT→400, FAILED_PRECONDITION→412, NOT_FOUND→404, UNAUTHENTICATED→502)
- [x] 2.4 Streaming plumbing: request `ReadableStream` → `PutObject` client-stream; `GetObject` server-stream → `Response` body stream

## 3. Bucket management

- [x] 3.1 List buckets — `ListBuckets` keyset infinite scroll (`useInfiniteQuery`, `page_token`)
- [x] 3.2 Create bucket — dialog with client-side name validation (3–63, lowercase alnum+hyphen, start/end alnum) + server error backstop
- [x] 3.3 Delete bucket — type-to-confirm modal showing object count + **orphan warning** (not empty-checked, blobs not cascaded)

## 4. Object browser

- [x] 4.1 Prefix "folder" navigation — `ListObjects(prefix)`, keyset paged, ordered by key
- [x] 4.2 Metadata drawer — `HeadObject` (size/content-type/crc32c/md5/generation), no body fetch
- [x] 4.3 Download / image preview — `GetObject` server-stream piped through the BFF
- [x] 4.4 Delete object — confirmation modal; disappears once the deletion propagates

## 5. Object upload

- [x] 5.1 Drag-drop + picker; local preview; content-type detection; object-key validation (≤1024 bytes, no traversal)
- [x] 5.2 Stream bytes through the BFF to `PutObject` (header then chunks) with a progress indicator
- [x] 5.3 Visible syncing: optimistic insert + per-item "syncing" badge + background `HeadObject`/refetch confirm
- [x] 5.4 Show the returned generation + computed checksums; v1 sends no `expected_*` checksums

## 6. Deploy

- [ ] 6.1 Helm chart in `deploy/charts/zeus` + reference Flux `HelmRelease` in `deploy/flux/`; `helm lint`/`template` clean
- [ ] 6.2 Behind Traefik + cert-manager TLS; lands in Codex `apps/` once its Flux base exists (see `design-codex-deployment`)

## 7. Go live

- [ ] 7.1 Swap `ApolloClient` from fixtures to live via env; wire `APOLLO_ENDPOINT`/`APOLLO_TOKEN`/`APOLLO_TLS_*`
- [ ] 7.2 End-to-end smoke against a real Apollo: create bucket → upload → list (observe syncing) → download → delete

## Future modules (post-v1 — one service at a time)

Deferred. Each future module is its **own** OpenSpec change, built and shipped **one service at a
time** (never in parallel), reusing the established pattern: a route group + typed client + fixtures +
Node-runtime BFF routes speaking that service's gRPC. Only the disabled nav stubs (1.4) ship in v1 —
**no future module is started until Apollo (0–7) is complete.** Candidate order + operator surface,
decided when we get there:

- [ ] Hermes module — HermesMQ operator view (lanes/topics, queue depths, DLQ inspect/replay)
- [ ] Artemis module — catalog operator view (tag admin, reindex/reprocess triggers, post status)
- [ ] (later, as needed) Hephaestus job status · Argus tagger runs
