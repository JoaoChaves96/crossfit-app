# Architecture Rules

## Backend

- Command / Query separation
- Commands mutate state
- Queries are read-only
- No business logic in controllers
- Validation at boundaries
- Header-based auth (x-user-id, x-gym-id)

## Frontend

- Screens derive state from backend truth
- No inferred state (e.g. booking status)
- No optimistic updates (for now)
- Context must be explicit (no implicit globals)
- Cross-platform APIs must work on web + native

## General

- No guessing schemas
- No mock data once integration starts
- Fix root causes, not symptoms
