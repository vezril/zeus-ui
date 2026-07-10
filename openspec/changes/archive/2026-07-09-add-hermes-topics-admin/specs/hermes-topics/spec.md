# hermes-topics

## ADDED Requirements

### Requirement: Typed Hermes client with fixtures by default
Zeus SHALL access HermesMQ through a typed `HermesClient` interface whose implementation is a
fixtures/mock client by default and the live BFF-backed HTTP client when selected by environment
configuration (`NEXT_PUBLIC_HERMES_API_BASE`), mirroring the Apollo client pattern.

#### Scenario: Env selects the implementation
- **WHEN** the live base configuration is unset
- **THEN** `getHermesClient()` returns the fixtures client and the `/hermes` UI is fully navigable
- **WHEN** the live configuration is set
- **THEN** `getHermesClient()` returns the HTTP client that calls Zeus's `/api/hermes/*` routes

### Requirement: List and create topics
Zeus SHALL list HermesMQ topics — each with its id and published-message count — and SHALL create a
topic after client-side validation of the topic id (mirroring HermesMQ's `TopicId` rules: non-blank
and not containing the reserved tenant separator), surfacing HermesMQ's `409`/`400` as the backstop.
Tombstoned (deleted) entries in the listing SHALL be excluded. (Labels are not carried by the listing;
they are viewed and edited per-topic — see *Edit topic labels*.)

#### Scenario: Topics are listed with their counts
- **WHEN** the operator opens `/hermes`
- **THEN** each existing (non-deleted) topic is shown with its id and published-message count

#### Scenario: Valid name creates, duplicate is reported
- **WHEN** the operator submits a valid new topic id
- **THEN** the topic is created and appears in the list with a "syncing" indicator until the eventually-consistent stats listing reflects it
- **WHEN** the id already exists
- **THEN** the create fails with a surfaced "already exists" (409) message and no duplicate is shown

#### Scenario: Invalid id is rejected before the request
- **WHEN** the entered topic id violates the id rules (e.g. contains the reserved separator)
- **THEN** the client blocks submission with a validation message

### Requirement: Edit topic labels
Zeus SHALL let the operator edit a topic's labels (a key/value map) and persist them via HermesMQ's
`PATCH /v1/topics/{id}`, which replaces the label map.

#### Scenario: Labels are updated
- **WHEN** the operator edits a topic's labels and saves
- **THEN** the full updated label map is sent and the topic reflects the new labels

### Requirement: Delete a topic behind confirmation
Zeus SHALL delete a topic only behind a confirmation modal, and the topic SHALL leave the listing once
the deletion succeeds.

#### Scenario: Delete requires confirmation
- **WHEN** the operator confirms deleting a topic
- **THEN** `DELETE /v1/topics/{id}` is issued and the topic is removed from the list
- **WHEN** the operator dismisses the modal
- **THEN** no delete is issued
