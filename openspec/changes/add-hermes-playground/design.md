# Design — add-hermes-playground

> How the Hermes interaction inspector is built on HermesMQ's existing REST pub/sub. Motivation in
> `proposal.md`; normative behavior in `specs/`.

## Context

Hermes is pub/sub with a lease/ack delivery model. The relevant REST surface (all already used by the
Topics / Subscriptions / DLQ slices):

```
  POST /v1/topics/{id}/messages   { payload, attributes[, ttlSeconds, idempotencyKey] }   publish
  POST /v1/subscriptions          { subscriptionId, topicId }   create (idempotent; 409 = exists)
  POST /v1/subscriptions/{id}/pull { max }  → { messages: [{ ackId, payload, attributes, publishTime }] }  (LEASES)
  POST /v1/subscriptions/{id}/ack  { ackIds }   removes leased messages
  GET  /v1/subscriptions          list (sub → topic) — to count real subscribers on a topic
```

Two facts shape the design:
- **Fan-out:** each subscription gets its own copy of every message; consumers *within* a subscription
  compete. → a Zeus-owned subscription is a non-destructive tap.
- **No DeleteSubscription** (confirmed: `subscription-lifecycle` has Create / Pull / Ack /
  ModifyAckDeadline, no delete; the gRPC `PubSubService` likewise). → the tap sub is reusable, not
  ephemeral.

## Goals / Non-Goals

**Goals:** publish to a topic and watch messages arrive live, in one view, without stealing from real
consumers and with zero HermesMQ change.

**Non-Goals:** attaching to an existing (real) subscription, topic history/replay, binary payload
rendering, consumer simulation (manual nack / redelivery control).

## Decisions

### Non-destructive tap via a reusable inspector subscription
Watching a topic = a Zeus-managed subscription on it, named `{HERMES_INSPECTOR_PREFIX}-{topic}`
(idempotent create, 409 = exists). It receives a fan-out copy of every message; real subscriptions are
untouched. Because HermesMQ has no DeleteSubscription, the sub is reusable (not deleted when the tap
closes); on the next open it is drained + acked to catch up to "now".

### Live feed = an SSE pull-loop with auto-ack
The tap is the BFF's first live surface. `GET /api/hermes/tap?topic=…` (Node runtime) ensures the
inspector sub, then pull-loops `/pull` (small `max`, short interval), emits each message as an SSE
event, and immediately acks it via `/ack`. Auto-ack is safe because the inspector is a dedicated sub
with a single consumer (Zeus) — acking just clears the displayed message. The browser reads it with an
`EventSource`; leaving the view closes the stream and the BFF stops pulling (tie the loop to the
response's abort signal).

REST pull-loop → SSE (rather than the gRPC `StreamMessages` server-stream) keeps the Hermes module
REST-only, consistent with `hermes-bridge`.

### Publish side-effect warning
`GET /v1/subscriptions` yields the subscriptions on the target topic; any that are not
`{HERMES_INSPECTOR_PREFIX}-*` are real consumers. When the count is > 0, the publish control shows a
warning that the message will reach live consumers (count shown). Publishing is still allowed — for
"see interactions" that's often the point — but the operator is told.

### Single view
Publish (left) + live feed (right), so a message you publish scrolls into the feed via the tap and the
"see interactions" loop is visible end to end (flag those messages as `mine`). Reuses the
fixtures-default `HermesClient` (fixtures simulate a tap by echoing published messages back onto the
feed, so the loop works offline) and the confirmation-modal / status-mapping patterns.

## Risks / Trade-offs

- **Idle inspector accumulation** — a reusable tap sub keeps getting fan-out copies when nobody's
  watching, growing until the next drain / message TTL. Mitigation: drain-on-open + rely on TTL; an
  upstream `DeleteSubscription` would make it ephemeral (worth an hermesmq issue, cf. the DLQ's
  hermesmq#57).
- **Publish side effects** — mitigated by the warning + a recommended `zeus.playground` topic; not
  eliminated (publishing is inherently real).
- **SSE lifecycle** — a dropped browser must not leave the BFF pull-loop running; the handler binds the
  loop to the response stream's abort signal and stops on disconnect.
- **TTL/idempotency over REST** — the gRPC `PublishRequest` carries `ttl_seconds` + `idempotency_key`;
  confirm the REST publish exposes them before wiring those fields (else omit from the form for v1).
