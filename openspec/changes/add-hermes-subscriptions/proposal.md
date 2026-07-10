# Change: add-hermes-subscriptions

> The second **Hermes** slice — a Subscriptions operator view (queue health + create) — reusing the
> REST BFF pattern from the archived `add-hermes-topics-admin`. One service, one slice at a time.

## Why

The Hermes module today manages topics but is blind to the thing operators most need to watch: the
**queues**. HermesMQ tracks, per subscription, its backlog (depth), oldest-unacked age, redelivery
count, and dead-letter count — but only over its REST/metrics surface. Surfacing that gives operators
a real "is anything backing up or dead-lettering?" view, and lets them wire a new subscription to a
topic. This is the natural next slice after topics.

## What Changes

- **hermes-subscriptions** (new): the `/hermes` Subscriptions view — list every subscription with its
  bound topic and **queue health** (backlog/depth, oldest-unacked-age, redelivered, dead-lettered),
  and create a subscription (validated id + topic binding). Read-only monitoring plus create; the list
  gets the same **visible-syncing** treatment as topics because it is fed by an eventually-consistent
  stats projection.
- **Hermes BFF** (extended, no requirement change): new Node-runtime handlers `GET/POST
  /api/hermes/subscriptions` reusing the existing `hermesFetch`/`proxyHermes`/status-mapping helpers
  (which already handle Hermes's `text/plain` write bodies and `403→502`).
- **Typed client** (extended): `HermesClient` gains `listSubscriptions()` + `createSubscription()`
  (fixtures + live http impl).
- **In-module navigation** (new): the Hermes module gains a Topics ⇄ Subscriptions switch (the module
  was single-view until now).

## Capabilities

### New Capabilities
- `hermes-subscriptions`: subscriptions operator view — list with queue-health stats (depth,
  oldest-unacked-age, redelivery + dead-letter counts) and create-subscription, via the typed
  `HermesClient` and the Hermes REST BFF.

### Modified Capabilities
<!-- None. hermes-bridge is extended with new routes but its requirements (proxy + status mapping +
     server-side token) are unchanged. In-module nav is additive within the Hermes module and does not
     change an app-shell requirement (Hermes is already "active"). -->

## Impact

- **New code in `zeus-ui`:** `src/app/api/hermes/subscriptions/route.ts` (BFF), `src/app/hermes/**`
  (a Subscriptions sub-view + in-module nav), `src/components/hermes/*` (subscriptions list + create
  dialog), and `HermesClient` additions in `src/lib/hermes/*` (types, client, fixtures, http).
- **Dependency:** HermesMQ's `GET /v1/subscriptions` (stats read model) and `POST /v1/subscriptions`,
  consumed as JSON. No new npm dependency (same REST BFF).
- **Blocked / out of scope (HermesMQ-side gaps — each a future change if Hermes adds the endpoint):**
  - **DLQ inspect/replay is not possible** with the current contract: dead-lettering is exposed only
    as a **count** (`deadLetteredTotal`); there is no endpoint to browse or replay dead-lettered
    messages. v1 surfaces the count only.
  - **No delete-subscription** (no `DELETE /v1/subscriptions/{id}`) and no single-subscription GET.
- **Deferred to later slices:** message peek/pull/ack (pull *leases* messages — side-effecting,
  warrants its own design) and publish-a-test-message.
