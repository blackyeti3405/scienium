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
