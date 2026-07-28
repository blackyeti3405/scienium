import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * REFACTOR2 P1-6, the notification half.
 *
 * v0.72.0 closed the activity half: `test/activity-durability.test.ts` asserts
 * an EMPTY list of durable-class activity writes made outside their domain
 * transaction. A user-facing NOTICE is the same class of write and was never
 * held to it — the teacher-feedback route wrote its notification with a bare
 * `.catch(() => {})` after the feedback had already committed, which is exactly
 * the shape that produces feedback a student is never told about.
 *
 * The rule, matching HANDOFF's CONVENTIONS: a notification about a domain event
 * commits in that event's transaction. Two things follow, and both are asserted
 * here because both were violated in the same file:
 *
 *   1. no notification write may swallow its own failure;
 *   2. `dedupeKey` is globally unique, so a key that is not unique BY
 *      CONSTRUCTION (a (subject, scope) pair, or a wall clock) collides on the
 *      second occurrence and takes the domain write down with it.
 */

const ROOT = join(__dirname, '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []
  })
}

function sourceFiles(): Array<{ path: string; src: string }> {
  return [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'lib'))]
    .filter((p) => !p.endsWith('.test.ts'))
    .map((p) => ({ path: relative(ROOT, p), src: readFileSync(p, 'utf8') }))
}

describe('a user-facing notice is as durable as the thing it announces', () => {
  it('no notification write swallows its own failure', () => {
    const swallowed: string[] = []
    for (const { path, src } of sourceFiles()) {
      // `db.notification.create({...}).catch(...)` across any amount of
      // whitespace/formatting — the `.catch` is the tell, wherever prettier put it.
      for (const m of src.matchAll(/notification\s*\.?\s*\.create\([\s\S]*?\)\s*\.catch\(/g)) {
        swallowed.push(`${path}:${src.slice(0, m.index).split('\n').length}`)
      }
    }
    // Asserted EXACTLY, like the activity list: a new best-effort notice fails
    // this the moment it lands.
    expect(swallowed.sort()).toEqual([])
  })

  it('no dedupeKey is built from a wall clock', () => {
    // `Date.now()` in a key defeats the unique column it is written into: a
    // retried transaction produces a different key and a duplicate notice, and
    // it is silent, because nothing ever conflicts.
    const clockKeyed: string[] = []
    for (const { path, src } of sourceFiles()) {
      for (const m of src.matchAll(/dedupeKey:[^\n]*(Date\.now\(\)|new Date\(\)\.getTime)/g)) {
        clockKeyed.push(`${path}:${src.slice(0, m.index).split('\n').length}`)
      }
    }
    expect(clockKeyed.sort()).toEqual([])
  })
})
