# Tasks: add-hermes-playground

Buildout sequence. Extends the Hermes module + REST BFF with a publish + live-tap "playground". The BFF
orchestrates HermesMQ publish/pull/ack; no HermesMQ change.

## 1. Client seam

- [x] 1.1 `PublishInput` (`{ topicId, payload, attributes, ttlSeconds?, idempotencyKey? }`) +
  `PublishResult` (`{ messageId, deduplicated }`) + `TapMessage` (`{ messageId, payload, isText, attributes, publishTime, mine? }`) in `src/lib/hermes/types.ts`; extend `HermesClient` with `publish(input)`, `openTap(topicId)` (returns an EventSource-like stream), `realSubscriberCount(topicId)`
- [x] 1.2 Fixtures: `publish` echoes the message onto the open tap (so the "see interactions" loop works offline); a couple of topics have real subscribers (→ warning), one is a clean `zeus.playground`
- [x] 1.3 Live http impl: `publish` → `POST /api/hermes/publish`; `openTap` → `EventSource('/api/hermes/tap?topic=…')`

## 2. BFF

- [x] 2.1 `HERMES_INSPECTOR_PREFIX` config + inspector-subscription helper in `src/lib/hermes/server/` (ensure `{prefix}-{topic}`, idempotent create, 409 = exists); `.env.example` entry
- [x] 2.2 `POST /api/hermes/publish` → `POST /v1/topics/{id}/messages` (payload + attributes [+ ttl/idempotency if the REST publish exposes them]); return `messageId` + `deduplicated`; status-mapped
- [x] 2.3 `GET /api/hermes/tap?topic=…` — SSE `ReadableStream` (Node runtime): ensure inspector → pull-loop (small `max`, short interval) → emit one SSE event per message → ack; stop on request abort
- [x] 2.4 `realSubscriberCount` for a topic via `GET /v1/subscriptions` (exclude `{prefix}-*`)

## 3. Playground view

- [x] 3.1 `/hermes/playground`: topic selector; publish form (payload, attributes k=v, optional TTL + idempotency key); side-effect warning when real subscribers > 0
- [x] 3.2 Live feed pane: subscribe via `openTap`, newest-first auto-scrolling list (message id, publish time, payload preview, attributes; a `mine` badge for messages this session published); connection state (tapping / reconnecting / stopped)
- [x] 3.3 Text/binary handling: render UTF-8 payloads, flag binary; copy-payload affordance

## 4. Navigation

- [x] 4.1 Add the **Playground** tab to the Hermes module nav (Topics · Subscriptions · Dead-letters · Playground)
