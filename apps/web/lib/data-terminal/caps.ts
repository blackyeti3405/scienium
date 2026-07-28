/**
 * Data Terminal capacity caps.
 *
 * These live here rather than in the route files for a reason `tsc` cannot tell
 * you about: a Next.js route module may only export the framework's own names
 * (the HTTP verbs plus `dynamic`, `runtime`, and friends). Exporting a constant
 * from `app/api/**\/route.ts` so a test can import it typechecks, lints, and then
 * fails `next build` with "not a valid Route export field".
 *
 * Both caps are enforced at write time inside a `lockAggregate` transaction
 * (P2-S1) — the reads take exactly the cap so a persisted row can never be
 * silently hidden from the list that is supposed to show it (P2-S2).
 */

/** Experiments one lab may hold. A refused create returns 409. */
export const MAX_EXPERIMENTS_PER_TEAM = 200

/** Measurement points one experiment may hold. A refused append returns 409. */
export const MAX_POINTS_PER_EXPERIMENT = 2_000
