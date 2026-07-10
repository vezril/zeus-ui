# Change: add-hermes-topics-admin

> The second constellation module for Zeus — **HermesMQ Topics administration** — built as
> the first Hermes slice per the "one service at a time" cadence established by the Apollo module.

## Why

Zeus ships with Apollo plus disabled "coming soon" stubs for the other services. Hermes is next.
HermesMQ is an event-sourced Pub/Sub broker whose topics are today only manageable via its API or
`curl` — there is no human-facing console. This change lights up the **`/hermes`** module with its
first, tightest operator surface (topic administration), proving the multi-service pattern generalizes
to a **second, differently-shaped** service and giving operators a place to create, label, inspect,
and delete Hermes topics.

## What Changes

- **Correct a design assumption:** the original `design-zeus-ui` note assumed every module would use a
  gRPC BFF. HermesMQ is **REST-first** (like Artemis, unlike gRPC-only Apollo), and its topic listing
  lives in the REST admin API — the gRPC contract has no `ListTopics`. So this module introduces a
  **thin REST BFF**, not gRPC (no `@grpc/grpc-js`).
- **hermes-bridge** (new): Node-runtime route handlers under `/api/hermes/*` proxying HermesMQ's `/v1`
  REST admin API, injecting the bearer token **server-side** (`HERMES_TOKEN`, never `NEXT_PUBLIC_*`) —
  the same secret boundary Apollo established, over REST. HTTP-status passthrough/mapping
  (409/400/404, and 403→502 as an ops misconfig).
- **hermes-topics** (new): the `/hermes` route group, a typed `HermesClient` (interface + fixtures by
  default + env-selected http impl → the BFF), and the topics operator UI — list topics (id, labels,
  published count), create topic (client-side id validation + labels editor + server backstop), edit
  labels, and delete topic (confirmation modal).
- **app-shell** (modified): the `hermes` service flips from a disabled "coming soon" stub to an
  **active** nav entry and route, and its dashboard health tile goes live via the BFF.

## Capabilities

### New Capabilities
- `hermes-bridge`: the Node-runtime REST BFF that fronts HermesMQ's `/v1` admin API with server-side
  token injection and clean HTTP-status mapping; the browser never holds the Hermes token.
- `hermes-topics`: topic administration — list (id/labels/published count), create (validated),
  edit labels, and delete (confirmed) — via the typed `HermesClient` (fixtures + live http impl).

### Modified Capabilities
- `app-shell`: the multi-service shell's "future modules are disabled stubs, only Apollo is active"
  requirement changes — **Hermes becomes active** (nav + route + live health tile); the remaining
  services stay stubbed.

## Impact

- **New code in `zeus-ui`:** `src/app/api/hermes/*` (BFF routes), `src/app/hermes/**` (route group),
  `src/lib/hermes/*` (typed client + fixtures + http), `src/components/hermes/*` (topics UI),
  `src/lib/hermes/validation.ts`; edits to `src/lib/services.ts` (activate Hermes) and the dashboard.
- **Config surface:** `HERMES_ENDPOINT` + server-side `HERMES_TOKEN` (never `NEXT_PUBLIC_*`), and the
  non-secret browser selector `NEXT_PUBLIC_HERMES_API_BASE`; wired into `.env.example` and the Helm
  chart/values.
- **Dependency:** HermesMQ's REST admin contract (`/v1/topics` + the observability topic listing),
  consumed as JSON. **No** new npm dependency (REST, not gRPC).
- **Out of scope (future Hermes slices, each its own change):** subscriptions + queue-depth/DLQ/
  redelivery stats, publish/peek/ack, DLQ inspect/replay, and auth/multi-tenancy UI (v1 uses a single
  server-side token). No change to HermesMQ or the Lexicon.
