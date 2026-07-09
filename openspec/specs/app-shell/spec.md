# app-shell

## Requirements

### Requirement: Operator console shell
The console SHALL present a dark, low-chrome, responsive layout with top navigation and
multi-service route groups — the Apollo module (`/apollo/**`) present in v1, later services stubbed —
so that adding a service module is additive rather than a restructure.

#### Scenario: Apollo module renders within the shell
- **WHEN** the operator navigates to `/apollo`
- **THEN** the Apollo module renders inside the shared shell (nav, theme) without a full-page reload

#### Scenario: Future modules appear as disabled stubs
- **WHEN** the operator views the navigation in v1
- **THEN** future service modules (e.g. Hermes, Artemis) appear as visible but disabled "coming soon" entries, and only Apollo is active

### Requirement: Service-health dashboard
The `/` route SHALL show one health tile per service, and Apollo's tile SHALL reflect its
`grpc.health.v1.Health` status (SERVING/NOT_SERVING) fetched through the BFF, which needs no
credential because Apollo leaves health auth-exempt.

#### Scenario: Tile reflects Apollo health
- **WHEN** Apollo reports `SERVING`
- **THEN** its dashboard tile shows an up/healthy state
- **WHEN** Apollo is unreachable or reports `NOT_SERVING`
- **THEN** its tile shows a down state
