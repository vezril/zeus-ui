# bucket-management

## Requirements

### Requirement: List and create buckets
Zeus SHALL list buckets with keyset infinite scroll (`page_token`) and create a bucket after
client-side validation of the name (3–63 chars, lowercase letters/digits/hyphens, starting and ending
with a letter or digit), surfacing Apollo's `INVALID_ARGUMENT`/`ALREADY_EXISTS` as the backstop.

#### Scenario: Valid name creates, duplicate is reported
- **WHEN** the operator submits a valid new bucket name
- **THEN** the bucket is created and appears in the list (with the syncing treatment)
- **WHEN** the name already exists
- **THEN** the create fails with a surfaced "already exists" (409) message and no duplicate is shown

### Requirement: Guarded bucket deletion
Deleting a bucket SHALL require type-to-confirm of the bucket name and SHALL display the bucket's
current object count with a warning that its contents are not removed here — because Apollo does not
require an empty bucket and does not cascade-delete blobs.

#### Scenario: Delete modal warns about orphaned contents
- **WHEN** the operator opens the delete-bucket modal for a non-empty bucket
- **THEN** the modal shows the object count and an orphan warning, and the delete action stays disabled until the bucket name is typed exactly
