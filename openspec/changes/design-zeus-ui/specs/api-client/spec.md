# api-client

## ADDED Requirements

### Requirement: Typed client with fixtures by default
Zeus SHALL access Apollo through a typed `ApolloClient` interface whose implementation is a
fixtures/mock client by default (so the UI runs before a reachable Apollo exists) and the live
BFF-backed HTTP client when selected by environment configuration, mirroring the Muses client pattern.

#### Scenario: Env selects the implementation
- **WHEN** the live base configuration is unset
- **THEN** `getClient()` returns the fixtures client and the UI is fully navigable
- **WHEN** the live configuration is set
- **THEN** `getClient()` returns the HTTP client that calls Zeus's `/api/apollo/*` routes
