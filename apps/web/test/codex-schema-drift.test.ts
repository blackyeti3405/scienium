import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * REFACTOR2 P1-R15 — `codex:merge` maintains a hand-written mirror of the
 * canonical lesson schema.
 *
 * The merge script is a `.mjs` run by bare node, so it cannot import a
 * TypeScript interface — and a TS interface has no runtime representation to
 * read even if it could. The audit's preferred fix (generate one representation
 * from the canonical source) would mean a codegen step for six short key lists.
 *
 * This is the cheaper thing that closes the same hole: parse `types.ts` and fail
 * when the two disagree. Adding a field to `Lesson` without updating the merge
 * script means the merge either silently rejects valid content or silently
 * accepts content the app cannot render — and now it means a red test first.
 */

const ROOT = join(__dirname, '..')
const TYPES = readFileSync(join(ROOT, 'lib/ops/codex/types.ts'), 'utf8')

/**
 * Property names of one exported interface.
 *
 * Deliberately simple — the file is hand-written, one property per line, no
 * nested object literals. If that ever stops being true this parser should be
 * replaced rather than patched, and `finds every interface it was asked for`
 * below is what will notice.
 */
function interfaceKeys(name: string): string[] {
  const m = TYPES.match(new RegExp(`export interface ${name}\\s*\\{([\\s\\S]*?)\\n\\}`))
  if (!m) return []
  return m[1]!
    .split('\n')
    .map((line) => line.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/, '').trim())
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)\??\s*:/)?.[1])
    .filter((k): k is string => !!k)
}

describe('codex merge script mirrors the canonical lesson schema', () => {
  it('finds every interface it was asked for (guards the parser itself)', () => {
    for (const name of ['Lesson', 'LessonSection', 'Checkpoint', 'McQuestion', 'OrderingQuestion', 'MatchingQuestion']) {
      expect(interfaceKeys(name).length, `${name} parsed to zero keys`).toBeGreaterThan(0)
    }
  })

  it('every shape the merge validates matches types.ts exactly', async () => {
    const { SHAPE_KEYS } = (await import(
      '../lib/ops/codex/scripts/merge-codex-segments.mjs'
    )) as { SHAPE_KEYS: Record<string, string[]> }

    for (const [name, keys] of Object.entries(SHAPE_KEYS)) {
      // The merge treats every listed key as REQUIRED, so an optional property
      // in types.ts would be a real mismatch — compare the full sets.
      expect([...keys].sort(), `${name} drifted from types.ts`).toEqual(interfaceKeys(name).sort())
    }
  })

  it('covers every shape a lesson draft can contain', async () => {
    const { SHAPE_KEYS } = (await import(
      '../lib/ops/codex/scripts/merge-codex-segments.mjs'
    )) as { SHAPE_KEYS: Record<string, string[]> }

    // CheckpointQuestion is a union of the three question interfaces; if a
    // fourth is ever added, the merge must learn to validate it.
    const unionArms = TYPES.match(/export type CheckpointQuestion = ([^\n]+)/)?.[1] ?? ''
    for (const arm of unionArms.split('|').map((a) => a.trim()).filter(Boolean)) {
      expect(SHAPE_KEYS[arm], `merge script does not validate ${arm}`).toBeDefined()
    }
  })
})
