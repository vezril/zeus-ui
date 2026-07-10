# Change: add-hermes-dlq

> The third **Hermes** slice — a dead-letter **triage** view (browse → replay/discard) built on
> HermesMQ's existing API, since Hermes dead-letters by republishing to a real topic.

## Why

The subscriptions view surfaces a `deadLetteredTotal` **count** but nothing actionable: an operator
who sees dead-letters can't see *what* failed or *do* anything about it. HermesMQ routes dead-lettered
messages to a configured **dead-letter topic** (payload preserved, tagged with
`x-dead-letter-subscription`, `x-delivery-attempts`, `x-original-message-id`). That makes a real
triage workflow possible today — **browse** the dead-letters and **replay** (redrive) or **discard**
each — without any new HermesMQ endpoint. (Ergonomic first-class DLQ endpoints are requested upstream
in [hermesmq#57](https://github.com/vezril/hermesmq/issues/57); this slice does not wait on them.)

## What Changes

- **hermes-dlq** (new): a Dead-letters triage view (`/hermes/dlq`) — browse the messages on the
  configured dead-letter topic (each shown with its source subscription, delivery attempts, original
  message id, and payload preview), and per message **Replay** (re-publish to its origin topic and
  remove from the DLQ) or **Discard** (remove from the DLQ).
- **Hermes BFF** (extended): new Node-runtime handlers `GET /api/hermes/dlq` (ensure a Zeus-managed
  inspector subscription on the DLQ topic, pull a batch, derive each message's origin topic) and
  `POST /api/hermes/dlq/replay` + `POST /api/hermes/dlq/discard`, orchestrating HermesMQ's
  pull/ack/publish. Reuses the existing `hermesFetch`/status-mapping helpers and the server-side token.
- **In-module navigation** (modified): the Hermes module gains a third tab — Topics · Subscriptions ·
  **Dead-letters**.
- **Config** (new): `HERMES_DLQ_TOPIC` (server-side) names the configured dead-letter topic; when
  unset, the view shows a clear "not configured" state.

## Capabilities

### New Capabilities
- `hermes-dlq`: dead-letter triage — browse the dead-letter topic (message metadata + payload
  preview) and replay-to-origin or discard per message, orchestrated over HermesMQ's pull/ack/publish
  by the Hermes REST BFF.

### Modified Capabilities
- `hermes-subscriptions`: the in-module navigation requirement expands from Topics/Subscriptions to
  include the Dead-letters view.

## Impact

- **New code in `zeus-ui`:** `src/app/api/hermes/dlq/*` (BFF), `src/app/hermes/dlq/**` (view),
  `src/components/hermes/*` (triage list + row actions), `HermesClient` additions
  (`listDeadLetters`, `replayDeadLetter`, `discardDeadLetter`), and the third nav tab.
- **Config:** `HERMES_DLQ_TOPIC` (server-side) in `.env.example` + the Helm chart.
- **Dependency:** HermesMQ's existing `POST /v1/subscriptions/{id}/pull` + `/ack`,
  `POST /v1/topics/{id}/messages`, and `GET /v1/subscriptions` (to map a source subscription → its
  origin topic). No new npm dependency; **no HermesMQ change required**.
- **Known limitations (recorded in design):**
  - **Text payloads only.** HermesMQ's REST pull/publish treat payloads as UTF-8 text, so replaying a
    **binary** payload through the BFF is lossy; v1 handles text payloads and flags binary.
  - **Browsing leases messages** (pull is not a passive peek), so the DLQ list is a triage working
    set, not a stable snapshot — fine for a single-operator LAN console. hermesmq#57 would make this a
    clean non-destructive browse.
- **Out of scope:** bulk "redrive all", per-subscription DLQ filtering beyond the `x-*` tags, and any
  dependence on the upstream ergonomic endpoints (tracked in hermesmq#57).
