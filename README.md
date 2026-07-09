# Zeus

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Zeus** is the constellation's operator/admin console — the sovereign control
panel that presides over the whole pantheon. Not a gallery (that's
[Muses](https://github.com/vezril/muses-ui)); a dark, low-chrome control panel
for humans to *manage* services directly.

The first module is **Apollo**, the object store: create/delete buckets,
upload/download/delete objects, inspect metadata. The layout is multi-service
from day one, so later modules (Hermes, Artemis, …) slot in additively — each
shipped as its own change, one service at a time.

## The defining decision — a BFF

Apollo has no REST facade; it is gRPC-only, and two of its RPCs stream
(`PutObject` client-stream, `GetObject` server-stream). A browser can't call
that directly. So unlike Muses (pure client-side `fetch`), Zeus ships a thin
**Backend-for-Frontend**: Node-runtime route handlers under `/api/apollo/*`
that speak gRPC to Apollo via `@grpc/grpc-js`.

The BFF is also a **secret boundary** — Apollo's bearer token and TLS trust are
injected server-side (`APOLLO_TOKEN`, never `NEXT_PUBLIC_*`); the browser only
ever talks to Zeus's own routes.

```
  React (TanStack Query)
      │  fetch('/api/apollo/…')            ← browser half, no gRPC
      ▼
  Zeus route handlers (runtime = 'nodejs') ← BFF half
      │  @grpc/grpc-js
      ▼
  Apollo  (APOLLO_ENDPOINT / APOLLO_TOKEN / APOLLO_TLS_* — all server-side)
```

## Stack

```
  Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 ·
  Radix primitives · TanStack Query · lucide-react · output: 'standalone'
  + @grpc/grpc-js in the server tier
  + TypeScript gRPC stubs generated from the Lexicon proto
```

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

By default the app runs on built-in fixtures/mocks; point it at a live Apollo
by setting `APOLLO_ENDPOINT` (and, if needed, `APOLLO_TOKEN` / `APOLLO_TLS_*`) —
see [`.env.example`](.env.example).

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # production standalone build
```

## Deploy

A multi-stage `Dockerfile` produces a small standalone Next.js server image,
published to Docker Hub by the release workflow (push a `vX.Y.Z` tag on `main`).
Deployed by [Codex](https://github.com/vezril/codex) behind Traefik +
cert-manager TLS via the Helm chart in `deploy/` (added with the deploy phase).

## Status

**Phase 0 — scaffold.** The full v1 design is captured as an OpenSpec change:
[`openspec/changes/design-zeus-ui`](openspec/changes/design-zeus-ui/) — six
capabilities (app-shell, apollo-bridge, bucket-management, object-browser,
object-upload, api-client) plus a `design.md` documenting the Apollo gRPC
contract Zeus consumes.

## The constellation

Zeus (this console) · Muses (public gallery) · Apollo (object store) ·
Artemis (catalog) · Hermes (queue) · Hephaestus (jobs) · Argus (tagger) ·
Codex (GitOps deploy) · the Lexicon (shared gRPC contracts).
