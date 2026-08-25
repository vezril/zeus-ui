# app-shell

## Requirements

### Requirement: Operator console shell
The console SHALL present a dark, low-chrome, responsive layout with top navigation and
multi-service route groups — the Apollo module (`/apollo/**`) active, later services stubbed — so
that adding a service module is additive rather than a restructure.

#### Scenario: Apollo module renders within the shell
- **WHEN** the operator navigates to `/apollo`
- **THEN** the Apollo module renders inside the shared shell (nav, theme) without a full-page reload

#### Scenario: Future modules appear as disabled stubs
- **WHEN** the operator views the navigation
- **THEN** Apollo is active, and the remaining service modules (e.g. Artemis, Hephaestus) appear as visible but disabled "coming soon" entries

### Requirement: Service-health dashboard
The `/` route SHALL show one health tile per service. Each active service's tile SHALL reflect that
service's live health fetched through the BFF: Apollo's via `grpc.health.v1.Health` (auth-exempt).
Stubbed services SHALL show a "coming soon" tile.

#### Scenario: Tile reflects Apollo health
- **WHEN** Apollo reports `SERVING`
- **THEN** its dashboard tile shows an up/healthy state
- **WHEN** Apollo is unreachable or reports `NOT_SERVING`
- **THEN** its tile shows a down state
