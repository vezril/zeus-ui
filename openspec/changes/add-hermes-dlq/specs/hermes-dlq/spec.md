# hermes-dlq

## ADDED Requirements

### Requirement: Configured dead-letter topic
The Dead-letters view SHALL read the configured dead-letter topic name from server-only configuration
(`HERMES_DLQ_TOPIC`). When it is unset, the view SHALL render a clear "not configured" state and SHALL
NOT attempt to read the DLQ.

#### Scenario: Not configured
- **WHEN** `HERMES_DLQ_TOPIC` is unset
- **THEN** the Dead-letters view explains that no dead-letter topic is configured and shows no messages

### Requirement: Browse dead-lettered messages
When a dead-letter topic is configured, Zeus SHALL show the dead-lettered messages on it, each with its
source subscription (`x-dead-letter-subscription`), delivery attempts (`x-delivery-attempts`), original
message id (`x-original-message-id`), publish time, and a payload preview. Reads SHALL go through the
BFF using a Zeus-managed inspector subscription on the dead-letter topic; because reading leases
messages, the view is a triage working set rather than a stable snapshot and SHALL say so.

#### Scenario: Dead-letters are listed with their metadata
- **WHEN** the operator opens the Dead-letters view and the DLQ topic has messages
- **THEN** each pulled message is shown with its source subscription, delivery attempts, original message id, publish time, and a payload preview

### Requirement: Replay a dead-lettered message to its origin
Zeus SHALL replay a selected dead-lettered message by re-publishing its payload to the origin topic —
derived from `x-dead-letter-subscription` via the subscriptions listing — and then removing it from the
dead-letter topic. When the origin topic cannot be derived, or the payload is not valid UTF-8 text,
replay SHALL be unavailable for that message with the reason shown.

#### Scenario: Replay redrives to the origin topic
- **WHEN** the operator replays a dead-lettered message whose source subscription resolves to a topic
- **THEN** the payload is published to that origin topic and the message is removed from the dead-letter topic

#### Scenario: Replay unavailable for an underivable origin or binary payload
- **WHEN** the source subscription no longer resolves to a topic, or the payload is not UTF-8 text
- **THEN** replay is disabled for that message and the reason is shown

### Requirement: Discard a dead-lettered message
Zeus SHALL discard a selected dead-lettered message by removing it from the dead-letter topic without
republishing, behind a confirmation.

#### Scenario: Discard removes the message
- **WHEN** the operator confirms discarding a dead-lettered message
- **THEN** the message is removed from the dead-letter topic and is not republished
