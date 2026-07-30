# Phase 1: Verify-State Audit (Report Only) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-20
**Phase:** 1-Verify-State Audit (Report Only)
**Areas discussed:** Fold-finding gate, Report format & inventory scope, Status-label thresholds, Duplicate-canonical selection rule, Fix-scope handoff format

---

## Fold finding into audit CONTEXT

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into CONTEXT | Cite the @/packages alias todo as a folded finding in CONTEXT.md `<decisions>` as pre-verified Phase 1 audit input; pin option (b) as first `02-01` proposed action; captured todo stays as evidence. | ✓ |
| Review-only (don't fold) | Leave the finding as a pending todo under `<reviewed_todos>`; auditor sees it via `todo.match-phase` but it isn't formally pinned as a decision/first-02-01-action. | |

**User's choice:** Fold into CONTEXT
**Notes:** User pre-authorized this in their preceding message ("Make sure it's written into the audit report when Phase 1 actually runs, with your recommended fix (option b …) flagged as the first Phase 2 action item"). The `cross_reference_todos` workflow step surfaced the todo at `score: 0.6` (keywords pvp/audit/broken/phase/route) via `gsd-sdk query todo.match-phase "1"`, validating the durable-capture chain.

---

## Report format & inventory scope

| Option | Description | Selected |
|--------|-------------|----------|
| Table-driven inventory | One table: row per committed PvP file → `[file \| §11 point \| status \| deviation+reason \| proposed fix + target plan]` + prose summaries per §11 + spec-staleness & Spell-Power-Meter callouts. Completeness verifiable by row-count. At `01-AUDIT-REPORT.md`. | ✓ |
| Sectioned prose per §11 | Narrative write-up per §11 subsection with built/broken/partial inline. Easier read; harder to prove "every file mapped" (AUDIT-01). | |
| Hybrid (inline tables in prose) | Table granularity inside §11 prose flow. Risks column drift across sections. | |

**User's choice:** Table-driven inventory
**Notes:** Chosen for AUDIT-01 verifiability (file↔§11↔label row-count check) and because it makes the proposed-fix → target-plan column first-class — directly hosting the folded option-b → `02-01` pin.

---

## Status-label thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| Broken = compile/runtime/invariant break | `broken`=fails tsc/runtime/stated invariant (alias tsc-break, TROPHY_LOSS_TODO stub); `partial`=functions but deviates (C-03, C-04, symmetric defender-loss); `duplicated`=≥2 competing impls; `built`=conforms. Alias → `broken`. Matches roadmap's 4 named labels. | ✓ |
| Broken = runtime/invariant only | Reserve `broken` for runtime/invariant (trophy math, idempotency); treat the `@/packages` tsc-404 as `partial` (a fixable import path). | |

**User's choice:** Broken = compile/runtime/invariant break
**Notes:** A non-compiling import is a broken module, not a wiring nicety — and labeling it `broken` feeds Phase 2 priority correctly (vs `partial` which reads as "parity fix later"). Separates "doesn't work" (`broken`) from "works but deviates" (`partial`).

---

## Duplicate-canonical selection rule

| Option | Description | Selected |
|--------|-------------|----------|
| Most-wired-to-live-route + closest to §11 | Canonical = the impl the live API route / UI actually calls, scored against §11; orphans flagged `duplicated`. Honest reflection of what runs; matches "current code = source of truth". | ✓ |
| Newest commit touching the point | Canonical = most recent git commit. Simple, but risks picking a half-finished rewrite over a working path. | |
| Tested/UI-imported variant wins | Canonical = what the UI/E2E imports and has tests. Degenerates to "first one found" because PvP has no `pvp.spec.ts` (C-01). | |

**User's choice:** Most-wired-to-live-route + closest to §11
**Notes:** The audit premise is "untracked sessions left PvP mid-build" — newest-commit selection would actively hide that reality. Most-wired-to-live-route surfaces orphans correctly.

---

## Fix-scope handoff format

| Option | Description | Selected |
|--------|-------------|----------|
| Per-finding column + summary approval table | Each row has a `Proposed Fix + Target Plan` cell (option-b → `02-01`); report ends with a consolidated "Phase 2 Fix Scope" approval table the user signs off to un-gate Phase 2. One artifact. | ✓ |
| Proposed-fix column only; separate sign-off note | Fix-scope direction captured conversationally into a separate sign-off note after review. Splits the review-gate outcome into a 2nd doc. | |
| Separate PHASE2-FIX-SCOPE.md doc | Ordered proposed fixes live in a separate doc referenced from the report. Clean separation; 2 artifacts to sync; report no longer self-contains the review gate. | |

**User's choice:** Per-finding column + summary approval table
**Notes:** Self-contains inventory + fix-targets + the hard review-gate artifact in one file, and gives the folded option-b its pin as the first `02-01` item inside the report itself.

---

## Claude's Discretion

None — all four audit-method gray areas were decided by the user (recommended option selected each time). The executor has no open method questions.

## Deferred Ideas

None — discussion stayed within Phase 1 (audit-report method) scope. Scope-creep check: no new PvP capabilities were proposed (guarded by the "Phase 1 changes zero source" boundary). The audit's *content* findings are uncovered work for the executor, not deferred ideas.

### Reviewed Todos (not folded)

None — the one pending todo (the @/packages alias finding) was folded into scope (see CONTEXT.md "Folded Todos"), not deferred.
