# ADR-003: Feature Module Boundaries

## Decision

- `app/**` owns routing and route adapters.
- `components/**` owns rendering and interaction.
- `lib/**` owns reusable domain and infrastructure code.
- `content/**` owns large authored or generated static datasets.
- API responses used by client state are decoded at runtime through
  `lib/api/client.ts`.

Route handlers should authorize, parse, invoke a feature service, and serialize.
They should not become the permanent home of workflows or external-service code.

## Realized examples

- `lib/buildings/service.ts` owns the plot economy (place/move/sell/upgrade) — the
  advisory lock, occupancy re-checks, and currency debits — and the four
  `app/api/buildings/*` handlers are thin adapters returning its discriminated result.
- `lib/uploads/assets.ts` owns the uploaded-asset lifecycle; the project-log routes
  only record intent (`attached`/`orphaned`) and never delete storage objects inline.
- These services return plain results and throw only for rollback, so they are
  unit-testable without a Next request or React.
