# Tasks: add-hermes-topics-admin

Buildout sequence. Mirrors the Apollo module: typed client backed by fixtures first, the REST BFF
early (it's the load-bearing seam), then the topics UI, then activation + go-live. No reachable
HermesMQ is assumed during development.

## 1. Client + contract seam

- [x] 1.1 `HermesClient` interface + browser DTOs (`Topic { id, labels, publishedCount }`, list/create/update/delete) in `src/lib/hermes/types.ts` + `client.ts`
- [x] 1.2 Topic-id validation in `src/lib/hermes/validation.ts` (mirror HermesMQ `TopicId` rules incl. the reserved tenant separator)
- [x] 1.3 Deterministic fixtures client (`src/lib/hermes/fixtures.ts`) with seed topics + labels + counts; mutations (create/patch-labels/delete) + 409/404 errors
- [x] 1.4 Env-selected `getHermesClient()` (`src/lib/hermes/index.ts`) — fixtures by default, http impl when `NEXT_PUBLIC_HERMES_API_BASE` is set

## 2. Hermes REST BFF (the boundary)

- [x] 2.1 Server config + fetch helper (`src/lib/hermes/server/client.ts`, `server-only`): `HERMES_ENDPOINT` + server-side `HERMES_TOKEN` as `Authorization: Bearer`; `.env.example` entries
- [x] 2.2 HTTP status mapping (`src/lib/hermes/server/http.ts`): 409→409, 400→400, 404→404, 403→502, 503→503; JSON error passthrough
- [x] 2.3 Node-runtime route handlers (`export const runtime = 'nodejs'`): `GET/POST /api/hermes/topics`, `GET/PATCH/DELETE /api/hermes/topics/[id]`, `GET /api/hermes/health`
- [x] 2.4 Live http `HermesClient` impl (`src/lib/hermes/http.ts`) calling `/api/hermes/*`; verify no server secret reaches the browser bundle

## 3. Topics UI (`/hermes`)

- [x] 3.1 `/hermes` route group + topics list (id, labels, published count) via `useTopics` (`src/app/hermes/page.tsx`, `src/components/hermes/*`)
- [x] 3.2 Create-topic dialog: client-side id validation + labels (key/value editor) + server 409/400 backstop
- [x] 3.3 Edit-labels dialog: `PATCH` the full label map
- [x] 3.4 Delete-topic confirmation modal; row leaves the list on success

## 4. Shell activation + deploy wiring

- [x] 4.1 Flip `hermes` in `src/lib/services.ts` to active (`href: /hermes`); dashboard Hermes tile goes live via `GET /api/hermes/health`
- [x] 4.2 Helm chart `hermes.*` values (endpoint, apiBase, token secret) mirroring the `apollo.*` block; `helm lint`/`template` clean

## 5. Go live

- [x] 5.1 Swap `HermesClient` to live via env; wire `HERMES_ENDPOINT`/`HERMES_TOKEN`/`NEXT_PUBLIC_HERMES_API_BASE`
- [x] 5.2 End-to-end smoke against a real HermesMQ (docker compose): list → create → edit labels → delete; confirm the `GET /v1/topics` published-count field shape
