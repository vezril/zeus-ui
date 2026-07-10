# Change: add-hermes-playground

> The fourth **Hermes** slice — an **interaction inspector**: publish a message to a topic and watch
> it (and everything else moving through that topic) arrive live, in one view. Built on HermesMQ's
> existing REST pub/sub, using a Zeus-managed **inspector subscription** as a non-destructive tap.

## Why

The Topics and Subscriptions views let an operator *manage* Hermes, but there's no way to *see it
work* — publish a test message and watch it flow, or observe what's actually moving through a topic.
That's the fastest way to sanity-check the messaging substrate, debug a producer, or demo the pipeline
(publish to `media.ingest` → watch Hephaestus react). This slice adds that live loop.

Consuming safely is the crux. Hermes is pub/sub: a topic fans out to subscriptions, each gets its own
copy, and consumers *within* a subscription compete. So Zeus must never read from a real service's
subscription — that would steal messages from Hephaestus/Argus. Instead it taps the topic through its
**own** subscription: a copy of everything, stealing from nobody.

## What Changes

- **hermes-playground** (new): a single-view interaction inspector (`/hermes/playground`) — pick a
  topic, **publish** (payload + attributes, optional TTL / idempotency key), and watch a **live feed**
  of messages arriving on a Zeus-managed inspector subscription for that topic. Publishing to a topic
  that has real (non-inspector) subscribers shows a side-effect warning.
- **Hermes BFF** (extended): new Node-runtime handlers — `POST /api/hermes/publish` (→ HermesMQ
  `POST /v1/topics/{id}/messages`) and an SSE endpoint `GET /api/hermes/tap?topic=…` that ensures the
  inspector subscription, pull-loops it, auto-acks, and streams each message to the browser. Reuses the
  `hermesFetch`/status-mapping helpers and the server-side token.
- **In-module navigation** (extended): the Hermes module gains a **Playground** tab (Topics ·
  Subscriptions · Dead-letters · Playground).
- **Config** (new): `HERMES_INSPECTOR_PREFIX` (server-side, default `zeus-inspector`) names the
  Zeus-managed inspector subscriptions.

## Capabilities

### New Capabilities
- `hermes-playground`: publish to a topic and watch a live message feed in one view, tapped
  non-destructively through a Zeus-managed inspector subscription over the Hermes REST BFF (publish +
  an SSE pull-loop with auto-ack).

## Impact

- **New code in `zeus-ui`:** `src/app/api/hermes/publish/route.ts` + `src/app/api/hermes/tap/route.ts`
  (BFF; the tap is an SSE `ReadableStream`, Node runtime), `src/app/hermes/playground/**` (the view),
  `src/components/hermes/*` (publish form + live feed), `HermesClient` additions (`publish(...)`,
  `openTap(topic)`, `realSubscriberCount(topic)`), and the fourth nav tab.
- **Config:** `HERMES_INSPECTOR_PREFIX` (server-side) in `.env.example` + the Helm chart.
- **Dependency:** HermesMQ's existing `POST /v1/topics/{id}/messages`, `POST /v1/subscriptions`,
  `POST /v1/subscriptions/{id}/pull` + `/ack`, and `GET /v1/subscriptions`. **No HermesMQ change
  required.** First **SSE / live** surface in Zeus (Apollo + the other Hermes views are request/response).
- **Known limitations (recorded in design):**
  - **No DeleteSubscription in HermesMQ** → the inspector subscription can't be truly ephemeral; it's a
    reusable per-topic sub (idempotent create, 409 = exists), drained + auto-acked on tap. While it
    exists, Hermes fans a copy of every message to it even when nobody's watching (it accumulates until
    the next drain / message TTL). A `DeleteSubscription` upstream would make the tap ephemeral.
  - **Live-forward only.** A tap shows messages published *after* it attaches (plus whatever its
    reusable sub accumulated since the last drain) — it is not a topic history browser.
  - **Text payloads.** HermesMQ REST treats payloads as UTF-8 text; binary payloads are flagged, not
    rendered (same limitation the DLQ slice notes).
  - **Publishing is real** — a published message reaches real subscribers. The side-effect warning
    surfaces this; a dedicated `zeus.playground` test topic is the safe habit.
- **Out of scope:** attaching to an *existing* subscription (a competing-consumer footgun), consumer
  simulation / manual nack, and topic message-history / replay.
