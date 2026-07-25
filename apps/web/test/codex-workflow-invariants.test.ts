import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * REFACTOR2 P1-R15 — the author workflow could return `allClean: true` after
 * producing nothing.
 *
 * `dirty`, `lost`, and `contradictions` are all empty when nothing was
 * attempted, so a run whose briefs every one died reported green having written
 * zero lessons. Three related holes: an empty brief was a warning rather than a
 * failed segment, the fixer agent's return was ignored (a dead fixer on a
 * MED/LOW round shipped the unit as clean with none of its findings applied),
 * and the reconciler's return was ignored with no re-detect.
 *
 * THIS IS A SOURCE-LEVEL CHECK, and that limitation is real. Workflow scripts
 * run in a sandbox with no filesystem or module access and this one ends in a
 * top-level `return`, so it cannot be imported and its logic cannot be executed
 * here. What this test can do is fail when a specific guard is deleted, which is
 * the regression that actually happened. It cannot prove the guards are correct.
 */

const SRC = readFileSync(
  join(__dirname, '..', '..', '..', '.claude', 'codex-pipeline', 'author-field.workflow.mjs'),
  'utf8',
)

/** The single `allClean` expression, so assertions below read against it alone. */
function allCleanExpression(): string {
  const at = SRC.indexOf('const allClean =')
  expect(at, 'allClean is no longer a named expression').toBeGreaterThan(-1)
  return SRC.slice(at, SRC.indexOf('\n\n', at))
}

describe('author-field workflow — completeness invariants', () => {
  it('a run that produced nothing cannot report allClean', () => {
    const expr = allCleanExpression()
    // Each of these is a way to have produced nothing while `dirty`, `lost`, and
    // `contradictions` are all trivially empty.
    expect(expr, 'a failed/empty brief must sink the run').toContain('failedSegments.length === 0')
    expect(expr, 'zero lanes must sink the run').toContain('lanes.length > 0')
    expect(expr, 'a plan with no lessons must sink the run').toContain('shippedLessons > 0')
    // And the original three still apply.
    expect(expr).toContain('dirty.length === 0')
    expect(expr).toContain('lost === 0')
    expect(expr).toContain('contradictions.length === 0')
  })

  it('an empty brief is a failed segment, not a skipped one', () => {
    expect(SRC).toContain('const failedSegments = segments')
    expect(SRC).toMatch(/brief agent died/)
    expect(SRC).toMatch(/brief returned no units/)
    // The old behaviour: filtered out with a warning and no accounting.
    expect(SRC).not.toContain('segment skipped')
  })

  it('failedSegments is returned so the orchestrator can see what was not authored', () => {
    expect(SRC).toMatch(/return \{ plan, results, contradictions, failedSegments, allClean \}/)
  })
})

describe('author-field workflow — every agent result is checked', () => {
  it('a dead fixer marks the lane dirty instead of shipping it clean', () => {
    expect(SRC).toContain('const fixed = await agent(fixPrompt(')
    expect(SRC).toContain("id: 'fixer-dead'")
    // The ship-on-no-surviving-HIGH path must come AFTER the dead-fixer guard,
    // or a dead fixer on a MED/LOW-only round still reports clean.
    const guard = SRC.indexOf("id: 'fixer-dead'")
    const ship = SRC.indexOf('if (survivingHigh.length === 0) {')
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(ship)
  })

  it('the author-died path was already guarded and still is', () => {
    expect(SRC).toContain("id: 'author-dead'")
  })

  it('reconciliation is followed by a deterministic re-detect using the same probe', () => {
    expect(SRC).toContain('const consistencyPrompt = ()')
    expect(SRC).toContain('const reconciled = await agent(')
    expect(SRC).toContain('consistency-recheck:')
    // `contradictions` must be REASSIGNED from the re-check, or the run still
    // reports what was found rather than what survived.
    expect(SRC).toMatch(/contradictions = remaining/)
  })

  it('a dead reconciler or dead re-check leaves the contradictions standing', () => {
    expect(SRC).toMatch(/reconciler died/)
    expect(SRC).toMatch(/consistency re-check died/)
  })
})
