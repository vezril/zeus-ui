# object-upload

## ADDED Requirements

### Requirement: Streaming object upload
Zeus SHALL upload files by streaming bytes through the BFF to `PutObject` (metadata header then
chunks) with a progress indicator and content-type detection, validating the composed object key
(≤1024 bytes UTF-8, no `NUL`, no path traversal; nested `/` prefixes allowed) before starting.

#### Scenario: Multi-chunk upload commits
- **GIVEN** an existing bucket and a file larger than one chunk
- **WHEN** the operator drags it in and confirms the upload
- **THEN** the object is committed and the response's generation and computed checksums are shown

#### Scenario: Invalid key is rejected before upload
- **WHEN** the composed key contains a `..` segment or a leading `/`
- **THEN** the client blocks the upload with a validation message and no bytes are streamed

### Requirement: Visible syncing after write
After a successful upload, Zeus SHALL optimistically show the object with a visible "syncing"
indicator and reconcile it against the eventually-consistent listing (via `HeadObject`/refetch) before
clearing the indicator.

#### Scenario: Object appears immediately then settles
- **WHEN** an upload succeeds but the object has not yet propagated to the read model
- **THEN** the object is shown immediately with a "syncing" badge, which clears once it appears in the list
