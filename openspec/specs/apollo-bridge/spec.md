# apollo-bridge

## Requirements

### Requirement: Node-runtime gRPC BFF
Zeus SHALL expose `/api/apollo/*` route handlers running on the Node runtime that translate browser
HTTP requests into Apollo `ObjectApi` gRPC calls via `@grpc/grpc-js`; the browser bundle SHALL NOT
contain or speak gRPC.

#### Scenario: Bucket list is served by the BFF
- **WHEN** the browser issues `GET /api/apollo/buckets`
- **THEN** a Node-runtime route handler calls Apollo `ListBuckets` and returns JSON, with no gRPC in the client bundle

### Requirement: Server-side Apollo credentials
The BFF SHALL inject Apollo's bearer token and TLS trust from server-only configuration
(`APOLLO_TOKEN`, `APOLLO_TLS_*`), and these values SHALL NOT be exposed as `NEXT_PUBLIC_*` or reach
the browser.

#### Scenario: Token stays server-side
- **WHEN** the client bundle and network traffic to the browser are inspected
- **THEN** `APOLLO_TOKEN` is absent, while the BFF still presents it as gRPC `authorization` metadata to Apollo

### Requirement: gRPC status to HTTP mapping
The BFF SHALL map Apollo gRPC status codes to HTTP responses: `ALREADY_EXISTS`→409,
`INVALID_ARGUMENT`→400, `FAILED_PRECONDITION`→412, `NOT_FOUND`→404, and `UNAUTHENTICATED`→502.

#### Scenario: Duplicate create surfaces as 409
- **WHEN** Apollo returns `ALREADY_EXISTS` for a `CreateBucket`
- **THEN** the BFF responds `409` and the UI shows a "bucket already exists" message

### Requirement: Streaming upload and download through the BFF
The BFF SHALL stream payloads without whole-file buffering: an upload feeds the request body into the
`PutObject` client-stream (header then chunks), and a download returns a response whose body is a
stream fed by the `GetObject` server-stream.

#### Scenario: Large object streams both ways
- **WHEN** a multi-chunk object is uploaded and later downloaded
- **THEN** it is stored and read back byte-for-byte identically without the BFF buffering it wholly in memory
