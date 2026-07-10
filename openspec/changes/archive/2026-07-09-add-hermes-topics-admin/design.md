# Design — add-hermes-topics-admin

> How Zeus's second module (HermesMQ Topics admin) is built. Motivation is in `proposal.md`;
> normative behavior in `specs/`.

## Context

Zeus v1 shipped the Apollo module plus disabled "coming soon" stubs, on the pattern *route group +
typed client (fixtures + env-selected http impl) + Node-runtime BFF*. Hermes is the next module.

The defining fact: **HermesMQ is REST-first**, not gRPC-only like Apollo. Its topic administration and
the operator-critical listing live in a REST admin API:

```
  HermesMQ REST (server/src/main/scala .../http/TopicAdminRoutes.scala, observability/ObservabilityRoutes.scala)
  GET    /v1/topics          list topics + published counts (observability)   ← the "ListTopics" the gRPC proto lacks
  POST   /v1/topics          {topicId, labels?} → 201 · 409 dup · 400 bad id · 403 no admin scope
  GET    /v1/topics/{id}     → {topicId, labels} · 404
  PATCH  /v1/topics/{id}     {labels} → 200 · 404
  DELETE /v1/topics/{id}     → 204 · 404
  /v1 is auth'd (bearer token, tenant-scoped); defaults to open single-tenant. /health + /metrics are public.
```

The gRPC `hermesmq/v1/hermes.proto` has `TopicAdminService` (no `ListTopics`) + pub/sub — it cannot
build a topic list. So this module must use REST.

## Goals / Non-Goals

**Goals:**
- A working `/hermes` operator module: list / create / label / delete topics, driven by a typed client
  (fixtures by default, live via env) exactly like Apollo, so the pattern is proven to generalize.
- Keep the Hermes bearer token **server-side** (secret boundary), consistent with Apollo.
- Activate Hermes in the shell nav + dashboard (live health), leaving the other stubs untouched.

**Non-Goals:**
- Subscriptions, queue-depth/DLQ/redelivery stats, publish/peek/ack, DLQ inspect/replay — each a later
  Hermes slice, its own change.
- Auth/multi-tenancy UI: v1 uses a single server-side token (the default admin principal / one tenant).
- Any change to HermesMQ or the Lexicon.

## Decisions

| Decision | Choice | Rationale / Alternatives |
|----------|--------|--------------------------|
| Transport | **Thin REST BFF** (`/api/hermes/*` → Hermes `/v1`) | Hermes is REST-first and its listing isn't in gRPC. Rejected a gRPC BFF (can't list topics; needless `@grpc/grpc-js`). Rejected browser-direct REST (would leak the bearer token). |
| Secret boundary | `HERMES_TOKEN` injected server-side as `Authorization: Bearer`; never `NEXT_PUBLIC_*` | Mirrors Apollo. The browser talks only to Zeus's `/api/hermes/*`. |
| Client selector | typed `HermesClient` iface + **fixtures by default** + http impl chosen by `NEXT_PUBLIC_HERMES_API_BASE` | Mirrors Apollo's `getClient()`; UI runs before a reachable Hermes exists. |
| Topic list | Single `GET /v1/topics` (published counts), rendered as a list; **no keyset** unless the endpoint paginates | The observability listing returns the set; keep it simple. Revisit if it grows/gains paging. |
| Topic-id validation | Mirror Hermes's `TopicId` rules client-side (reject the reserved tenant separator that yields 400) + server backstop | Instant feedback; Hermes stays the source of truth. |
| Labels | A key/value editor; create sends `labels?`, edit sends the full `labels` map via `PATCH` | Matches the REST contract (PATCH replaces the label map). |
| Delete | **Simple confirmation modal** (not type-to-confirm) | A topic delete is single-item; unlike Apollo's bucket delete there is no orphaned-blob hazard to warn about. |
| BFF error mapping | 409→409, 400→400, 404→404, **403→502**, 503→503 | 403 = Zeus's token lacks the `admin` scope = ops misconfig (parallels Apollo's `UNAUTHENTICATED→502`), not a user error. |
| Dashboard health | BFF probes Hermes over REST (`/health`) for the tile | Hermes health is public; no gRPC health client needed here. The `HealthStatus` DTO/tile from app-shell is reused. |

## Risks / Trade-offs

- **Two BFF shapes now (gRPC for Apollo, REST for Hermes).** → Acceptable and intended: each module
  speaks its service's native transport behind the same typed-client seam; the browser contract
  (`/api/<svc>/*` JSON) is uniform regardless.
- **`GET /v1/topics` shape/pagination unverified in detail.** → Confirm the JSON shape (published-count
  field name) against the running service during implementation; keep the DTO mapping in one place.
- **No `LabelValue`/`TopicId` regex copied yet.** → Derive the client-side rule from Hermes's
  `TopicId.from` / `TenantScope.validateExternalId`; the server 400 is the backstop if the mirror drifts.
- **Auth defaults to open.** → v1 targets the default single-tenant admin principal; a wrong/missing
  token surfaces as 502 on writes, which the UI reports as an ops error.

## Migration Plan

Additive only — no existing behavior removed. Ships as a feature branch → PR into `main`, CI-gated,
browser-verified on fixtures (and optionally a live HermesMQ via `docker compose`). The Helm chart
gains `hermes.*` values (endpoint, apiBase, token secret) mirroring the `apollo.*` block. Rollback is
reverting the PR; the Hermes nav entry simply returns to a stub.

## Resolved during build (verified against a live HermesMQ 1.7.0)

- `GET /v1/topics` returns `[{ topicId, publishedTotal, deleted }]` — **no labels**, and includes
  `deleted` tombstones. The list shows id + `publishedTotal`, filters `deleted === true`, and labels
  are fetched per-topic via `GET /v1/topics/{id}` for the edit view.
- **The listing is HermesMQ's stats *projection*, not a topic registry — it is eventually
  consistent.** A just-created topic appears after the projection lag (~1s), and a deleted one lingers
  until its tombstone projects. So the topic list gets the same **visible-syncing** treatment as
  Apollo's buckets: optimistic insert with a "syncing" badge on create, a "deleting" badge on delete,
  and polling until the projection settles.
- Hermes's **write responses are `text/plain`** ("…created / fulfilled"), not JSON. The BFF proxy
  forwards a JSON body only for GET; writes pass through status-only.
- Topic-id rule: non-blank (trimmed) and must not contain the reserved tenant separator `~`.

## Open Questions

- Whether `GET /v1/topics` paginates at scale (assume no for v1; revisit if needed).
