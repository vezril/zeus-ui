# hermes-subscriptions

## MODIFIED Requirements

### Requirement: Navigate between Topics and Subscriptions
The Hermes module SHALL present in-module navigation across its Topics, Subscriptions, Dead-letters,
and Playground views, each addressable by its own route within the shared shell.

#### Scenario: Operator switches views
- **WHEN** the operator selects Subscriptions from the Hermes module navigation
- **THEN** the Subscriptions view renders at its own route inside the shared shell without a full-page reload
- **WHEN** the operator selects Dead-letters
- **THEN** the Dead-letters view renders at its own route
- **WHEN** the operator selects Playground
- **THEN** the Playground view renders at its own route
- **WHEN** the operator selects Topics
- **THEN** the Topics view renders
