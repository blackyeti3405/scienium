# Architecture Decisions

[`ARCHITECTURE.md`](../ARCHITECTURE.md) describes the deployed system at a high level. This directory
records decisions whose invariants must survive future feature work.

- [ADR-001: Team and classroom ownership](./adr-001-team-class-ownership.md) — superseded by ADR-004
- [ADR-002: Durable paper processing](./adr-002-paper-processing.md)
- [ADR-003: Feature module boundaries](./adr-003-feature-boundaries.md)
- [ADR-004: Per-student class membership](./adr-004-per-student-class-membership.md)
- [Repo refactor implementation plan](./repo-refactor-implementation-plan.md)
- Data Terminal: three-lane analysis workbench (Sheets / Lab / Code) over the `Dataset` spine; **built and shipped** (phases A–F, v0.76.0). The as-built architecture — models, lane components, the Pyodide runtime + same-origin proxy, the analysis-templates registry, the code bridge, and the showcase figure asset — is mapped in [feature-map.md](./feature-map.md#operations-hub--the-daily-loop), with the design spec in `docs/SPEC.md` §7.6
