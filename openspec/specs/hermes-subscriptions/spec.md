# hermes-subscriptions

## Requirements

### Requirement: List subscriptions with queue health
Zeus SHALL list HermesMQ subscriptions, each with its bound topic and queue-health metrics — backlog
(depth), oldest-unacked age, redelivered count, and dead-lettered count — sourced from
`GET /v1/subscriptions`. Because that listing is an eventually-consistent stats projection, the view
SHALL apply the same visible-syncing treatment as the topics list.

#### Scenario: Subscriptions are listed with their queue health
- **WHEN** the operator opens the Subscriptions view
- **THEN** each subscription is shown with its subscription id, its topic id, backlog (depth), oldest-unacked age, redelivered count, and dead-lettered count

#### Scenario: Dead-letters are emphasized
- **WHEN** a subscription's dead-lettered count is greater than zero
- **THEN** that count is visually emphasized (never color-only — always shown with the number and a label)

### Requirement: Create a subscription
Zeus SHALL create a subscription bound to a topic after client-side validation of the subscription id
(non-blank, not containing the reserved tenant separator `~`) and the target topic id, surfacing
HermesMQ's `409`/`400` as the server backstop. A newly created subscription SHALL appear in the list
with a "syncing" indicator until the eventually-consistent stats listing reflects it.

#### Scenario: Valid subscription is created
- **WHEN** the operator submits a valid new subscription id bound to a topic
- **THEN** the subscription is created and appears in the list with a "syncing" indicator until the stats listing catches up

#### Scenario: Duplicate is reported
- **WHEN** the submitted subscription id already exists
- **THEN** the create fails with a surfaced "already exists" (409) message and no duplicate is shown

#### Scenario: Invalid id is rejected before the request
- **WHEN** the entered subscription id or topic id violates the id rules (blank, or contains `~`)
- **THEN** the client blocks submission with a validation message

### Requirement: Navigate between Topics and Subscriptions
The Hermes module SHALL present in-module navigation between its Topics and Subscriptions views, each
addressable by its own route within the shared shell.

#### Scenario: Operator switches views
- **WHEN** the operator selects Subscriptions from the Hermes module navigation
- **THEN** the Subscriptions view renders at its own route inside the shared shell without a full-page reload
- **WHEN** the operator selects Topics
- **THEN** the Topics view renders
