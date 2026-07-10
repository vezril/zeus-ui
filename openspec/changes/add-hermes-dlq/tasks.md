# Tasks: add-hermes-dlq

Buildout sequence. Extends the Hermes module + REST BFF with a dead-letter triage view. The BFF
orchestrates HermesMQ's pull/ack/publish; no HermesMQ change.

## 1. Client seam

- [ ] 1.1 `DeadLetter` DTO (`{ ackId, payload, isText, publishTime, sourceSubscription, deliveryAttempts, originalMessageId, originTopic | null }`) + `DlqView` (`{ configured, dlqTopic, messages }`) in `src/lib/hermes/types.ts`; extend `HermesClient` with `listDeadLetters()`, `replayDeadLetter(msg)`, `discardDeadLetter(ackId)`
- [ ] 1.2 Fixtures: a configured DLQ with a few dead-letters (one non-text/binary, one whose source subscription is missing → replay unavailable); replay/discard mutate the in-memory set
- [ ] 1.3 Live http impl calling `/api/hermes/dlq*`

## 2. BFF orchestration

- [ ] 2.1 `HERMES_DLQ_TOPIC` + inspector-subscription helper in `src/lib/hermes/server/` (ensure `zeus-dlq-inspector` on the DLQ topic — idempotent create, 409 = exists); `.env.example` entry
- [ ] 2.2 `GET /api/hermes/dlq` — not-configured state when unset; else pull a batch from the inspector sub, parse `x-*` attributes, detect non-UTF-8 payloads, and derive each origin topic from `GET /v1/subscriptions`
- [ ] 2.3 `POST /api/hermes/dlq/replay` — publish payload to origin topic then ack on the inspector sub (surface a failed ack); `POST /api/hermes/dlq/discard` — ack only

## 3. Dead-letters UI + nav

- [ ] 3.1 Add the **Dead-letters** tab to the Hermes in-module nav (`/hermes/dlq`)
- [ ] 3.2 Triage view via `useDeadLetters`: "not configured" state; otherwise the leased batch with source subscription, attempts, original id, publish time, payload preview, and a "triage — pulled messages are leased" note
- [ ] 3.3 Per-row **Replay** (redrive to origin; disabled with reason when origin underivable or payload binary) and **Discard** (confirm); rows leave the list on success

## 4. Deploy + go live

- [ ] 4.1 Helm `hermes.dlqTopic` value → `HERMES_DLQ_TOPIC`; `helm lint`/`template` clean
- [ ] 4.2 End-to-end smoke against a real HermesMQ configured with a dead-letter topic: force a dead-letter (exhaust a subscription's attempts), browse it, replay → confirm it lands on the origin topic and leaves the DLQ; discard another
