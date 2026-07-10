# hermes-playground

## ADDED Requirements

### Requirement: Publish a message to a topic
Zeus SHALL let an operator publish a message to a selected topic through the BFF — a payload and
optional attributes (and, where HermesMQ's REST publish exposes them, an optional TTL and idempotency
key) — and SHALL show the resulting message id and whether the publish was deduplicated.

#### Scenario: A published message returns its id
- **WHEN** the operator publishes a payload to a topic
- **THEN** the message is published via the BFF and its message id is shown

#### Scenario: A duplicate publish is surfaced
- **WHEN** a publish carries an idempotency key that collapses to an existing message within the dedup window
- **THEN** the result is shown as deduplicated, carrying the original message id

### Requirement: Non-destructive live tap via an inspector subscription
Zeus SHALL watch a topic by consuming from its OWN Zeus-managed inspector subscription
(`{HERMES_INSPECTOR_PREFIX}-{topic}`, idempotently created; 409 = exists), never from a real service's
subscription. Because HermesMQ has no delete-subscription, the inspector is reusable; on tap it SHALL be
drained and acknowledged so the feed reflects current activity. Real subscriptions SHALL be unaffected.

#### Scenario: The tap does not steal from real consumers
- **GIVEN** a topic with a real subscription (e.g. a worker) and a Zeus inspector subscription
- **WHEN** a message is published to the topic
- **THEN** both the real subscription and the inspector receive their own copy, and the tap consumes only from the inspector

#### Scenario: Reads on the inspector are acknowledged
- **WHEN** the tap displays a message pulled from the inspector subscription
- **THEN** that message is acknowledged (a dedicated inspector sub with one consumer), not left to redeliver

### Requirement: Live message feed
Zeus SHALL stream messages arriving on the inspector subscription to the browser live, as Server-Sent
Events from a Node-runtime BFF handler, rendering each with its message id, publish time, attributes,
and a payload preview, newest first. Closing the view SHALL stop the server-side pull-loop.

#### Scenario: A published message appears in the feed
- **GIVEN** the tap is open on a topic
- **WHEN** a message is published to that topic (by Zeus or anything else)
- **THEN** it appears in the live feed with no manual refresh

#### Scenario: Closing the view stops the tap
- **WHEN** the operator leaves the playground or closes the tap
- **THEN** the BFF stops pulling the inspector subscription

### Requirement: Publish side-effect warning
Before publishing, Zeus SHALL indicate whether the target topic has real (non-inspector) subscribers,
so the operator knows a published message will reach live consumers.

#### Scenario: Warn when real subscribers exist
- **GIVEN** the selected topic has one or more non-inspector subscriptions
- **WHEN** the operator prepares to publish
- **THEN** a warning shows that the message will reach real consumers (with the count), while still allowing the publish

### Requirement: Playground surface in the Hermes module
Zeus SHALL expose the playground as a Playground entry in the Hermes module navigation, alongside
Topics, Subscriptions, and Dead-letters, opening the single view that combines the publish form and the
live feed.

#### Scenario: Navigate to the Playground
- **WHEN** the operator selects the Playground entry in the Hermes module
- **THEN** the combined publish + live-feed view is shown
