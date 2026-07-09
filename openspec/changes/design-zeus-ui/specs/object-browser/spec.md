# object-browser

## ADDED Requirements

### Requirement: Prefix browsing and metadata
Zeus SHALL browse a bucket's objects by prefix (S3-style "folders") with keyset pagination, and SHALL
show an object's metadata via `HeadObject` (content-type, size, crc32c, md5, generation) without
fetching its payload.

#### Scenario: Prefix filters the listing
- **GIVEN** a bucket with keys `photos/a.jpg`, `photos/b.jpg`, and `docs/x.txt`
- **WHEN** the operator navigates into the `photos/` prefix
- **THEN** only `photos/a.jpg` and `photos/b.jpg` are listed, ordered by key

#### Scenario: Metadata drawer avoids a body fetch
- **WHEN** the operator opens an object's metadata drawer
- **THEN** the drawer shows size/content-type/checksums/generation sourced from `HeadObject` with no payload transferred

### Requirement: Download and delete objects
Zeus SHALL download or image-preview an object by streaming `GetObject` through the BFF, and SHALL
delete an object only behind a confirmation modal.

#### Scenario: Download returns exact bytes
- **WHEN** the operator downloads a previously uploaded object
- **THEN** the received bytes equal the uploaded bytes

#### Scenario: Delete requires confirmation and settles
- **WHEN** the operator confirms deleting an object
- **THEN** `DeleteObject` is issued and the object leaves the listing once the deletion propagates
