/**
 * Teacher read limits — the CONTRACT, not ad-hoc route constants (P2-1's
 * standing rule). Both teacher list routes import the same number, so the
 * roster and the reports view can never disagree about which students are in
 * scope, and a route module never has to export a constant a test wants
 * (`test/route-guard-sweep.test.ts` refuses that).
 *
 * Two limits with deliberately DIFFERENT failure modes, because they are
 * different kinds of thing:
 *
 *  - `MAX_TEACHER_CLASS_SCOPE` bounds an AUTHORIZATION scope. Truncating it
 *    silently drops classes out of `ctx.classIds`, which does not hide a row in
 *    a list — it makes a teacher's own students 404 from every per-student
 *    route with no signal anywhere. An authorization scope that overflows must
 *    REFUSE, never serve a partial answer.
 *  - `MAX_TEACHER_ROSTER_STUDENTS` bounds a DISPLAY list. Refusing there would
 *    take a whole department's roster offline over a number no real teacher
 *    reaches; the honest behaviour is to serve the page and SAY it is partial,
 *    which is what the `truncated` flag and its banner are for.
 */

/**
 * Classes one teacher's authorization scope may span. No real teacher owns
 * anywhere near this many; the bound exists so a data-entry mistake or a bad
 * import cannot turn a per-request read into an unbounded one.
 */
export const MAX_TEACHER_CLASS_SCOPE = 200

/**
 * Students returned by the roster/reports reads for one teacher's whole class
 * scope. A real deployment tops out at a few hundred (several sections); the
 * bound is a ceiling on a growing read, not an expected condition.
 */
export const MAX_TEACHER_ROSTER_STUDENTS = 1_000

/**
 * Read `take` for a bounded list: one more than the limit, so the extra row is
 * the overflow signal. Never `take: LIMIT` — that is indistinguishable from a
 * list that happens to be exactly full.
 */
export function overflowTake(limit: number): number {
  return limit + 1
}

/** Split an overflow-probed read into the page to serve and whether it was cut. */
export function withOverflow<T>(rows: T[], limit: number): { rows: T[]; truncated: boolean } {
  return rows.length > limit ? { rows: rows.slice(0, limit), truncated: true } : { rows, truncated: false }
}
