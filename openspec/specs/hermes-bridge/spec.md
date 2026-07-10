# hermes-bridge

## Requirements

### Requirement: Node-runtime REST BFF for Hermes
Zeus SHALL expose `/api/hermes/*` route handlers running on the Node runtime that proxy HermesMQ's
`/v1` REST admin API; the browser SHALL talk only to these routes and never directly to HermesMQ.

#### Scenario: Topic list is served by the BFF
- **WHEN** the browser issues `GET /api/hermes/topics`
- **THEN** a Node-runtime route handler calls HermesMQ `GET /v1/topics` and returns JSON to the browser

### Requirement: Server-side Hermes credentials
The BFF SHALL inject HermesMQ's bearer token from server-only configuration (`HERMES_TOKEN`), and this
value SHALL NOT be exposed as `NEXT_PUBLIC_*` or reach the browser.

#### Scenario: Token stays server-side
- **WHEN** the client bundle and traffic to the browser are inspected
- **THEN** `HERMES_TOKEN` is absent, while the BFF still presents it as an `Authorization: Bearer` header to HermesMQ

### Requirement: HTTP status mapping
The BFF SHALL surface HermesMQ's admin statuses to the browser as: `409`→409 (topic already exists),
`400`→400 (invalid topic id), `404`→404 (topic not found), `403`→502 (Zeus's token lacks the `admin`
scope — an ops misconfiguration, not a user error), and `503`→503.

#### Scenario: Duplicate create surfaces as 409
- **WHEN** HermesMQ returns `409` for a topic that already exists
- **THEN** the BFF responds `409` and the UI shows an "already exists" message

#### Scenario: Missing admin scope surfaces as 502
- **WHEN** HermesMQ returns `403` because the configured token lacks the `admin` scope
- **THEN** the BFF responds `502`, signalling an operator misconfiguration rather than a user error
