# Design — add-hermes-dlq

> How the Hermes dead-letter triage view is built on HermesMQ's *existing* API. Motivation in
> `proposal.md`; normative behavior in `specs/`.

## Status: SHELVED (2026-07-10) — blocked on hermesmq#57

Implemented and fixtures-verified, but **not shipped**: a live smoke against real HermesMQ 1.7.0 proved
the fan-out-inspector approach is **unsafe for production**. Revisit once HermesMQ has dedicated
DLQ endpoints ([hermesmq#57](https://github.com/vezril/hermesmq/issues/57)).

### Why shelved — two flaws inherent to reading the DLQ via a fan-out subscription

1. **The inspector dead-letters its own browse-leases → corruption + bounce loop.** The DLQ inspector
   is itself a subscription on the dead-letter topic, so it participates in redelivery/dead-lettering.
   Browsing *leases* messages (pull, no ack); a message left un-triaged past the attempt limit is
   **dead-lettered by the inspector**, re-routed back onto the dead-letter topic re-tagged
   `x-dead-letter-subscription=zeus-inspector-dead-letters`. That corrupts origin derivation (origin
   becomes the dead-letter topic), loses the true origin (so replay breaks), and self-feeds. Confirmed
   live: after a browse-lease expired, the message reappeared with a nested `dead-letter:…:dead-letter:…`
   ack id and `origin=dead-letters`. (Immediate with `max-attempts=1`; ~`max × ack-deadline` in normal
   config — silent and nasty when it hits.)
2. **Forward-only visibility.** A fan-out inspector only receives dead-letters published *after* it is
   created, so a pre-existing DLQ backlog is invisible; the first-ever DLQ view shows nothing.

Both are cleanly solved by hermesmq#57 (a non-destructive DLQ browse + a redrive that don't lease). The
verified-good parts: the browse *did* show a real dead-letter with correct `source` and derived
`origin` when fresh, and the BFF orchestration + all primitives pass fixtures/prior live smokes.

## Context

HermesMQ has no dedicated DLQ API. Instead (`redelivery-timers` spec, *Dead-letter topic routing*): a
message that exhausts its attempts is **republished to a single configured dead-letter topic**, payload
byte-preserved, with attributes `x-dead-letter-subscription`, `x-delivery-attempts`,
`x-original-message-id`. The dead-letter topic is a normal topic, so its messages are reachable through
ordinary pub/sub:

```
  POST /v1/subscriptions                      create a subscription (idempotent create → 409 = exists)
  POST /v1/subscriptions/{id}/pull  { max }   → { messages: [{ ackId, payload, attributes, publishTime }] }   (LEASES)
  POST /v1/subscriptions/{id}/ack   { ackIds } removes leased messages
  POST /v1/topics/{id}/messages     { payload, attributes }  publish (used for replay)
  GET  /v1/subscriptions                      map a source subscription → its origin topic
```

## Goals / Non-Goals

**Goals:** let an operator see the dead-lettered messages for the configured DLQ topic and, per message,
**replay** (redrive to the origin topic) or **discard** — with zero HermesMQ changes.

**Non-Goals:** a stable non-destructive browse (needs hermesmq#57), binary payload replay, bulk redrive,
and per-subscription DLQ topics.

## Decisions

| Decision | Choice | Rationale / Alternatives |
|----------|--------|--------------------------|
| DLQ topic source | **`HERMES_DLQ_TOPIC`** server-side config | HermesMQ doesn't expose the configured dead-letter topic name over its API, so Zeus is told it. Unset → the view renders a "not configured" state. |
| Reading the DLQ | A **Zeus-managed inspector subscription** on the DLQ topic (`zeus-dlq-inspector`), created lazily (idempotent; 409 = already exists), then **pull a batch** | Pull is the only read path. Rejected creating a subscription per request (churns state). |
| Browse semantics | **Triage working set, not a snapshot.** A GET leases a batch; the operator acts on each. Un-acted messages return to AVAILABLE after the ack deadline (or an explicit release on the next GET) | Pull inherently leases — there is no peek. Honest framing: this is a triage queue, not a list. hermesmq#57 tracks a true browse. |
| Replay (redrive) | Publish the message's payload to its **origin topic** (derived: `x-dead-letter-subscription` → its `topicId` via `GET /v1/subscriptions`), then **ack** the message on the inspector subscription (remove from DLQ) | Redrive = re-publish + remove. Rejected leave-in-DLQ (would replay endlessly on re-browse). |
| Discard | **Ack** the message on the inspector subscription (remove, no republish) | The only "delete a message" primitive available. |
| Payload handling | **UTF-8 text.** Replay re-publishes the text payload; a non-text (binary) payload is flagged as lossy and its replay is disabled/​warned | HermesMQ's REST pull/publish are text-only; binary integrity needs a bytes-safe surface (out of scope). |
| BFF endpoints | `GET /api/hermes/dlq` (ensure inspector sub + pull + derive origin), `POST /api/hermes/dlq/replay` (`{ ackId, originTopic, payload, attributes }` → publish + ack), `POST /api/hermes/dlq/discard` (`{ ackId }` → ack) | The browser holds the pulled message; the BFF performs the two-step orchestration server-side (token stays server-side). |
| In-module nav | Add a third tab **Dead-letters** to the Hermes Topics/Subscriptions nav | Additive; modifies the hermes-subscriptions nav requirement. |

## Risks / Trade-offs

- **[Browsing leases messages]** → while an operator views a batch, those messages are hidden from
  redelivery for the ack-deadline window and reappear if not acted on. Acceptable for a single-operator
  LAN console; note it in the UI ("triage — pulled messages are leased").
- **[Origin-topic mapping depends on the source subscription still existing]** → if `x-dead-letter-
  subscription` no longer resolves via `GET /v1/subscriptions`, replay can't derive the topic; the row
  shows replay as unavailable with the reason. (hermesmq#57's `x-original-topic` would remove this.)
- **[Text-only payloads]** → binary dead-letters render/replay unsafely; detect non-UTF-8 and disable
  replay for those rows.
- **[Two-step replay isn't atomic]** → publish-then-ack; if the ack fails after a successful publish the
  message could be replayed twice on a later browse. Surface the ack failure; idempotent-publish keys
  are out of scope here.

## Migration Plan

Additive; feature branch → PR into `main`, CI-gated, browser-verified on fixtures and end-to-end against
a live HermesMQ configured with a dead-letter topic (force a dead-letter by exhausting a subscription's
attempts, then browse → replay → confirm it lands back on the origin topic and leaves the DLQ). Rollback
is reverting the PR; the Dead-letters tab returns.

## Resolved during build

- **Reused the Playground's `ensureInspector`** for the DLQ inspector instead of a bespoke
  `zeus-dlq-inspector` — the DLQ inspector is just an inspector on the DLQ topic
  (`{HERMES_INSPECTOR_PREFIX}-{dlqTopic}`), so it's consistent with the tap and recognized by
  `isInspectorSub`. (The Playground slice shipped first, which made this reuse available.)
- **`GET /api/hermes/dlq` pulls WITHOUT acking** (unlike the Playground tap, which auto-acks) — DLQ is
  triage, so acking happens only on Replay/Discard.
- Replay **strips the dead-letter markers** (`x-dead-letter-subscription`, `x-delivery-attempts`,
  `x-original-message-id`) before re-publishing, so the origin gets a clean message.
- Batch size fixed at `max: 25` for v1.

## Open Questions

- Whether to auto-release (nack via `modifyAckDeadline 0`) un-acted messages when the view unmounts.
