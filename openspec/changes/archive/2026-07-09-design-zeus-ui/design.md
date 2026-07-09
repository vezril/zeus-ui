# Zeus UI — design note

> **Status:** exploration capture (pre-implementation). This is the seed design for `zeus-ui`,
> the constellation's operator console. Starts with an **Apollo** module; built to grow into a
> one-place, find-all UI across the other services.

## What Zeus is

A self-hosted **operator/admin console** for the constellation. Not a gallery (that's Muses) — a
control panel for humans to *manage* services directly: create/delete buckets, upload/download/delete
objects, inspect metadata, and (later) drive the other services from the same UI.

Naming: Greek = apps. **Zeus presides over the whole pantheon** — the sovereign control panel that
oversees every service. Repo `zeus-ui`, matching `muses-ui`.

First milestone scope: **Apollo** (the object store). Everything else is deliberately deferred, but
the layout is structured so adding a service later is additive, not a retrofit (see *Module shape*).

## The defining decision: bridging browser → Apollo

Muses got to cheat. Its `.env.example` says it outright: *"Muses talks REST/JSON to Artemis and
consumes HTTP media URLs — it never speaks gRPC."* Muses is pure client-side `fetch()` to **Artemis'
REST gateway**; no server tier, and it never touches Apollo.

**Apollo has no REST facade — it's gRPC-only, and two of its RPCs stream:**

```
ObjectApi (the-lexicon: apollostorage/grpc/object_api.proto)
  CreateBucket / DeleteBucket / HeadObject / DeleteObject   ← unary
  ListBuckets / ListObjects                                 ← unary (read model, EVENTUALLY CONSISTENT)
  PutObject(stream …) → …                                   ← CLIENT-streaming  (header, then chunks)
  GetObject(…) → stream …                                   ← SERVER-streaming  (header, then chunks)
```

A browser cannot call this directly. Options considered:

```
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │ A) Next.js BFF (route handlers speak gRPC)          ◄── CHOSEN                  │
 │    browser ─REST/JSON+multipart─► Zeus route ─@grpc/grpc-js─► Apollo            │
 │    ✓ Node does client-streaming (PutObject) + server-streaming (GetObject)      │
 │    ✓ Apollo bearer token + TLS trust stay SERVER-side (browser never holds them)│
 │    ✓ one deployable, no extra infra                                             │
 │                                                                                 │
 │ B) grpc-web + Envoy proxy                            ◄── REJECTED               │
 │    ✗ grpc-web CANNOT do client-streaming → PutObject (upload) is impossible     │
 │    ✗ extra Envoy deployment; token ends up near the browser                     │
 │                                                                                 │
 │ C) Standalone apollo-gateway REST service (Scala)    ◄── REJECTED (for now)     │
 │    ✓ purest "UI never speaks gRPC" consistency                                  │
 │    ✗ a whole new Scala/Pekko service to deploy, just for admin                  │
 └───────────────────────────────────────────────────────────────────────────────┘
```

**Chosen: A — a thin Next.js BFF.** An operator console *is* a translation layer, so a backend-for-
frontend is its natural shape. Node's `@grpc/grpc-js` handles both streaming RPCs that eliminate
option B. The browser bundle still "never speaks gRPC" — the gRPC lives in Zeus's **server tier**,
not the client. This is the one structural difference from Muses (which has no server tier); Zeus
already ships a Node server via `output: 'standalone'`, so it's a natural extension, not new infra.

**Security bonus:** the BFF is a **secret boundary.** Apollo's optional `authorization: Bearer`
token and TLS trust are injected server-side from Zeus config (`APOLLO_TOKEN`, **not** a
`NEXT_PUBLIC_*` var) — the browser never sees them. Muses had no secrets to hide; Zeus does, and the
BFF is exactly where they belong. (Consistent with the access-model: LAN-only, no app auth in v1.)

## Architecture

Mirror Muses' client pattern (typed interface · fixtures by default · http impl when configured),
one layer deeper — the http impl calls *Zeus's own routes*, which are the gRPC bridge:

```
  React components
      │  TanStack Query  (same as Muses)
      ▼
  ApolloClient (typed iface)  ── fixtures by default (dev before Apollo exists)
      │  httpClient → fetch('/api/apollo/…')              ── browser half (no gRPC)
  ┌───┴────────────────────────────────────────────────────────────┐
  │  Zeus route handlers   (export const runtime = 'nodejs')        │  ── BFF half (new vs Muses)
  │  GET/POST   /api/apollo/buckets                                 │  ListBuckets / CreateBucket
  │  DELETE     /api/apollo/buckets/[bucket]                        │  DeleteBucket
  │  GET/POST   /api/apollo/buckets/[bucket]/objects               │  ListObjects / PutObject(upload)
  │  GET/DELETE/HEAD  /api/apollo/buckets/[bucket]/objects/[key]   │  GetObject / DeleteObject / HeadObject
  └───┬────────────────────────────────────────────────────────────┘
      ▼  @grpc/grpc-js  →  Apollo   (APOLLO_ENDPOINT, APOLLO_TOKEN, APOLLO_TLS_* — all server-side)
```

- Route handlers **must** be Node runtime (`grpc-js` won't run on edge).
- **Upload** streams: the route consumes the request `ReadableStream` and feeds the `PutObject`
  client-stream chunk-by-chunk (header first, then bytes) — no whole-file buffering.
- **Download/preview** streams: the route opens the `GetObject` server-stream and returns a
  `Response` whose body is a `ReadableStream` fed by the gRPC chunks.
- Bytes transit Zeus's Node process, but *streamed* — fine for a LAN operator tool with large media.

## Apollo RPC → UI mapping

```
  UI surface                     RPC(s)                    note
  ──────────────────────────────────────────────────────────────────────────────
  Bucket list + "New bucket"     ListBuckets / CreateBucket
  Delete bucket                  DeleteBucket              NOT empty-checked (spec) → modal shows object count + orphan warning
  Object browser (prefix tree)   ListObjects(prefix=…)     S3-style "folders" via prefix; keyset paged → infinite scroll
  Drag-drop upload + progress    PutObject (client-stream) browser→route→gRPC chunks; content_type from file
  Download / image preview       GetObject (server-stream) route pipes bytes back
  Metadata drawer                HeadObject                size/crc32c/md5/generation, no body fetch
  Delete object                  DeleteObject              confirm modal
```

### Validation rules — mirror Apollo `domain-model` client-side (resolved)

Apollo validates and returns `INVALID_ARGUMENT` on bad input, but Zeus should mirror the rules in
the form for instant feedback (and still surface the server error as the backstop):

- **Bucket name** (`BucketName`): 3–63 chars, lowercase letters / digits / hyphens, must **start and
  end** with a letter or digit. (GCS-inspired.) Regex-checkable in the "New bucket" dialog.
- **Object key** (`ObjectName`): 1–1024 **bytes** UTF-8 (measure bytes, not chars), no `NUL`, and no
  path-traversal — reject `.`/`..` segments, a leading `/`, and backslashes. Nested keys like
  `photos/2026/07/dive-log.jpg` **are** valid (that's how the prefix "folders" work). When composing
  an upload key from `currentPrefix + filename`, normalize and validate against these rules.

### DeleteBucket safety (resolved — important)

The domain does **not** require a bucket to be empty before deletion, and deleting a bucket does not
cascade-delete blobs (blob cleanup is the separate in-progress `add-blob-gc` change in Apollo). So a
delete can leave orphaned objects. The confirmation modal SHALL therefore show the current object
count and warn that contents are not removed here — type-to-confirm the bucket name for deletion.
*(Verify against the shipped implementation as `add-blob-gc` lands; the spec is currently silent on
emptiness, which we read as "not enforced.")*

### Checksums (resolved)

`PutObject` computes `crc32c`/`md5` server-side and returns them; the `expected_*` header fields are
**optional** (a mismatch → `FAILED_PRECONDITION`). **v1: leave expected checksums empty**, and
**display** the returned checksums after upload. *Revisit:* compute `crc32c`/`md5` in the browser for
end-to-end integrity (send them as `expected_*`) if upload corruption ever becomes a concern.

### BFF error mapping (gRPC status → HTTP)

The route handlers translate Apollo's gRPC `status` into HTTP so the browser client gets clean codes:

```
  ALREADY_EXISTS        → 409   (duplicate CreateBucket)
  INVALID_ARGUMENT      → 400   (bad bucket/object name)
  FAILED_PRECONDITION   → 412   (checksum mismatch)
  NOT_FOUND             → 404   (missing bucket/object)
  UNAUTHENTICATED       → 502   (Zeus's APOLLO_TOKEN wrong/absent — an ops misconfig, not a user error)
  OK                    → 200/201
```

## Eventual consistency → **visible syncing** (decided)

`ListBuckets`/`ListObjects` are served from the read model — *eventually consistent*. So after a
create/upload, the item may not appear in the next list immediately. Muses never hit this (it read
Artemis' own projections); Zeus must be honest about write→read lag.

**Decision — optimistic insert + visible per-item "syncing" badge + background confirm:**

```
  write succeeds ──► optimistically insert the item, render with a "syncing…" badge
                     │
                     ├─ background: poll HeadObject (entity-consistent) — confirms existence now
                     └─ background: refetch the list until the item appears → drop the badge
```

Rationale: optimistic-only silently drops the item on the next refetch (looks like a bug); a global
spinner over everything is worse. A transient per-item state tells the truth without feeling broken.
`HeadObject` is the "does it really exist yet?" truth even while the list lags.

## Destructive actions → **confirmation modals** (decided)

This is an admin tool with `DeleteBucket`/`DeleteObject`, and in v1 there's **no app auth** — the UI
*is* the only guardrail. Every destructive action goes behind an explicit confirmation modal
(type-to-confirm for bucket deletion; simple confirm for object deletion). No silent deletes.

## Module shape — build for find-all now (decided)

Structure for multi-service from day one, even though only Apollo ships first (cheap now, painful to
retrofit):

```
  /                     dashboard — service-health tiles (Apollo up? …), links into each module
  /apollo               Apollo console (landing: bucket list)
  /apollo/[bucket]      object browser (prefix nav, upload, per-object actions, metadata drawer)
  /hermes   (later)     HermesMQ operator view
  /artemis  (later)     Artemis operator view
  …                     one route group + one typed client per service; Apollo is the first instance
```

Each service = a route group + its own typed client (+ fixtures + http→BFF routes). Apollo is simply
the first concrete instance of that shape.

**Cadence: one service at a time.** v1 ships Apollo plus **disabled "coming soon" nav stubs** for the
others — the multi-service layout is visible from day one, but each real module is built and shipped
as its **own** subsequent OpenSpec change, never in parallel. No future module is started until Apollo
is complete. Likely order (decided when we get there): Hermes (queue/lane operator view), then Artemis
(catalog/tag admin), then others as needed (Hephaestus job status, Argus tagger runs).

## Stack

```
  SAME as Muses:  Next.js 15 (App Router) · React 19 · Tailwind v4 · Radix primitives ·
                  TanStack Query · lucide-react · cva/clsx/tailwind-merge · TypeScript ·
                  output:'standalone' · deploy/charts + deploy/flux (Helm + Flux) · dark theme
  NEW for Zeus:   @grpc/grpc-js in the server tier
                  + TypeScript gRPC stubs generated from the Lexicon proto
```

### Lexicon TypeScript stubs (decided, revisitable)

The Lexicon publishes Scala (`io.codex:lexicon-grpc`) and Python stubs, but **no TypeScript target
yet** — Zeus is its first TS consumer.

**Decision:** generate TS stubs **inside Zeus** from the Lexicon's `.proto` as the source (proto
stays in the Lexicon — single source of truth preserved; pull it via git submodule or a pinned
fetch at build, don't fork-copy it), using `buf`/`ts-proto`. **Defer** publishing an npm artifact
from the Lexicon until a *second* TS consumer appears.

Rationale: one proto today, no premature npm-publishing infra, and the single-source principle holds.
**Revisit trigger:** a second TS consumer → promote to a published `@codex/lexicon-ts` npm artifact
generated by the Lexicon (mirroring how the Scala/Python artifacts are published).

## Config surface (draft)

```
  APOLLO_ENDPOINT        host:port of Apollo's gRPC surface (server-side)
  APOLLO_TOKEN           optional bearer token, injected into gRPC metadata (server-side, NOT public)
  APOLLO_TLS_ENABLED     whether to dial over TLS (h2c vs TLS, matching Apollo api-security)
  APOLLO_TLS_CA          trust anchor when TLS on (server-side)
```

No `NEXT_PUBLIC_*` secrets — the browser only ever talks to Zeus's own `/api/apollo/*` routes.

## Resolved from Apollo specs (2026-07-09)

- **Bucket/object validation rules** — resolved (see *Validation rules* above).
- **DeleteBucket empty-only?** — No; not enforced, and blobs aren't cascade-deleted → orphan warning
  in the modal (see *DeleteBucket safety*).
- **Health tiles** — use the standard **`grpc.health.v1.Health` service** (SERVING/NOT_SERVING),
  which Apollo implements and leaves **auth-exempt**; the BFF calls `Health.Check` per service for the
  `/` dashboard tiles. No `ListBuckets` probe hack needed.
- **Pagination** — keyset (`page_token` = last key of the previous page) → **infinite scroll**
  (`useInfiniteQuery`), not numbered pages.
- **Checksums** — resolved (v1 empty + display returned; see *Checksums*).

## Still open (revisit, not blocking)

- Large-object download through the BFF: fine as-is on LAN; offer a direct-ish path later only if it
  becomes a bottleneck.
- Browser-side checksum computation for end-to-end upload integrity (the *revisit* under *Checksums*).
- Promote Lexicon TS stubs to a published npm artifact once a second TS consumer appears.
```
