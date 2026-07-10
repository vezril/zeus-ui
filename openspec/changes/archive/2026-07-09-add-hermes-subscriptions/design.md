# Design — add-hermes-subscriptions

> How the Hermes Subscriptions view is built. Motivation in `proposal.md`; normative behavior in
> `specs/`. Reuses the REST BFF + typed-client + visible-syncing pattern proven by the topics slice.

## Context

The Hermes module (`/hermes`) manages topics over a thin REST BFF (`/api/hermes/*` → HermesMQ `/v1`,
server-side token). This slice adds the **subscriptions** operator surface. Grounded in HermesMQ 1.7.0
(`observability/ObservabilityRoutes.scala`, `http/PubSubRoutes.scala`):

```
  GET  /v1/subscriptions   → [{ subscriptionId, topicId, backlog, oldestUnackedAgeSeconds,
                                redeliveredTotal, deadLetteredTotal }]   ← stats projection (eventually consistent)
  POST /v1/subscriptions   { subscriptionId, topicId } → 201 · 409 dup · 400 bad id   (text/plain body, like topics)
```

There is **no** `GET /v1/subscriptions/{id}`, **no** `DELETE`, and **no** DLQ browse/replay endpoint —
dead-lettering is exposed only as the `deadLetteredTotal` count.

## Goals / Non-Goals

**Goals:**
- A Subscriptions view listing each subscription with its topic and queue health (depth, age,
  redelivery, dead-letter counts), plus create-subscription — reusing the topics slice's client/BFF/
  visible-syncing machinery.
- In-module navigation so the Hermes module cleanly holds both Topics and Subscriptions.

**Non-Goals:**
- DLQ message inspect/replay (not in the Hermes contract — see Risks). Delete-subscription (no REST
  endpoint). Message peek/pull/ack and publish-a-test-message (later slices).

## Decisions

| Decision | Choice | Rationale / Alternatives |
|----------|--------|--------------------------|
| Transport | **Extend the existing Hermes REST BFF** with `GET/POST /api/hermes/subscriptions` | Reuses `hermesFetch`/`proxyHermes`/`mapHermesStatus` unchanged (they already handle text/plain writes + 403→502). No new capability for the bridge. |
| In-module IA | A **sub-route `/hermes/subscriptions`** with a small Topics ⇄ Subscriptions tab bar shared across the module; `/hermes` stays the Topics view | Keeps each view a real route (shareable, back-button) and additive. Rejected a single mega-page and rejected tabbed client-only state (loses routing). |
| List freshness | **Visible-syncing** (optimistic insert + poll) on the subscriptions list | `GET /v1/subscriptions` is a stats projection — eventually consistent, exactly like the topics list; reuse the same treatment. |
| Subscription-id validation | Mirror the topic-id rule (non-blank, no reserved `~`); the topic binding is validated the same way | Same `TenantScope.validateExternalId` rule server-side; reuse `validateTopicId` (rename/generalize to an id validator). |
| Dead-letter emphasis | Show `deadLetteredTotal` as a normal metric, **emphasized** (e.g. destructive-tinted badge) when `> 0` | Operators scan for trouble; make dead-letters visually pop without color-only signalling (always paired with the number/label). |
| Queue-health display | Show backlog (depth), oldest-unacked-age (humanized from seconds), redelivered, dead-lettered per row | Directly the `SubscriptionStatsJson` fields; format age seconds → `2m`, `1h`, etc. |

## Risks / Trade-offs

- **[DLQ inspect/replay is impossible with the current Hermes contract]** → v1 shows only the
  dead-letter **count**. Browsing/replaying dead-lettered messages needs a new HermesMQ endpoint; it is
  a separate, Hermes-side change and is called out as blocked in the proposal.
- **[`GET /v1/subscriptions` stats lag]** → a just-created subscription appears after the projection
  catches up; handled by visible-syncing (same as topics).
- **[No delete-subscription]** → the view is create + monitor only; deletion awaits a Hermes endpoint.
- **[Backlog/age reflect the read model, not a live count]** → acceptable for an operator overview;
  the numbers are the same ones HermesMQ exposes to Prometheus.

## Migration Plan

Additive — no existing behavior removed. Feature branch → PR into `main`, CI-gated, browser-verified on
fixtures and (optionally) end-to-end against a live HermesMQ via docker: create a subscription, watch
it appear in the stats list (eventual-consistency lag), publish to its topic out-of-band to see
`backlog`/`deadLetteredTotal` move. Rollback is reverting the PR.

## Open Questions

- Whether to also show a per-topic subscription count on the Topics view (nice-to-have; defer).
