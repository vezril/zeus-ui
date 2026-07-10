# Tasks: add-hermes-subscriptions

Buildout sequence. Extends the Hermes module (client seam + REST BFF already exist). Mirrors the topics
slice: client + fixtures first, BFF next, then the UI + in-module nav, then go-live.

## 1. Client seam

- [x] 1.1 `Subscription` DTO (`{ subscriptionId, topicId, backlog, oldestUnackedAgeSeconds, redeliveredTotal, deadLetteredTotal }`) in `src/lib/hermes/types.ts`; extend `HermesClient` with `listSubscriptions()` + `createSubscription(subscriptionId, topicId)`
- [x] 1.2 Generalize id validation in `src/lib/hermes/validation.ts` (a shared `validateHermesId` used by topic id + subscription id + topic binding: non-blank, no reserved `~`)
- [x] 1.3 Fixtures: seed subscriptions with varied stats (incl. one with dead-letters); `createSubscription` (409 dup, 400 bad id) in `src/lib/hermes/fixtures.ts`
- [x] 1.4 Live http impl for `listSubscriptions`/`createSubscription` in `src/lib/hermes/http.ts` (calls `/api/hermes/subscriptions`)

## 2. BFF route

- [x] 2.1 Node-runtime `GET/POST /api/hermes/subscriptions` (`src/app/api/hermes/subscriptions/route.ts`) reusing `hermesFetch` + `proxyHermes` + `mapHermesStatus`; GET maps stats JSON → `Subscription[]`, POST forwards `{subscriptionId, topicId}`

## 3. Subscriptions UI + in-module nav

- [x] 3.1 In-module Topics ⇄ Subscriptions nav (a small tab/segmented control shared by the Hermes views); Topics stays at `/hermes`, Subscriptions at `/hermes/subscriptions`
- [x] 3.2 Subscriptions list via `useSubscriptions`: one row per subscription with topic + backlog/depth, humanized oldest-unacked age, redelivered, and dead-lettered (emphasized when `> 0`); visible-syncing on the list
- [x] 3.3 Create-subscription dialog: subscription id + topic id, client-side validation + server 409/400 backstop; optimistic insert with "syncing" badge

## 4. Go live

- [x] 4.1 End-to-end smoke against a real HermesMQ (docker): create subscription → observe it appear in the stats list (eventual-consistency lag); publish to its topic out-of-band and confirm `backlog`/`deadLetteredTotal` surface in the row
