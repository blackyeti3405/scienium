import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

import { PER_STUDENT_INVENTORY } from '@/lib/data-requests/inventory'

/**
 * REFACTOR2 P1-R9 — the inventory has to stay true to the schema.
 *
 * An export list and a deletion list that drift from the models they name is the
 * exact failure the runbook had: a table gets added, nobody remembers to add it
 * to the procedure, and a "complete" erasure quietly leaves rows behind. Here
 * both directions are one list, so the remaining risk is that the list names a
 * model or column that no longer exists — which a mocked unit test would never
 * catch, because the mock answers to any name.
 *
 * So this parses `schema.prisma` itself and pins the KEEP decisions too: a model
 * that holds a student's user id but belongs to the team is listed by name here,
 * so moving one into the inventory is a deliberate edit with a test to update,
 * not a silent widening of what erasure destroys.
 */

const SCHEMA = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')

/** `model X { … }` → the field names declared inside it. */
function fieldsOf(model: string): string[] | null {
  const start = SCHEMA.indexOf(`\nmodel ${model} {`)
  if (start === -1) return null
  const end = SCHEMA.indexOf('\n}', start)
  return SCHEMA.slice(start, end)
    .split('\n')
    .slice(2)
    .map((line) => line.trim().split(/\s+/)[0] ?? '')
    .filter((name) => name && !name.startsWith('//') && !name.startsWith('@@') && !name.startsWith('/'))
}

/** Delegate name (`paperQuizAttempt`) back to the model name (`PaperQuizAttempt`). */
const modelName = (delegate: string) => delegate[0]!.toUpperCase() + delegate.slice(1)

/**
 * Models that carry a student's user id and are deliberately NOT erased. Each
 * reason is in `lib/data-requests/inventory.ts`; this list is here so that
 * moving one is a decision somebody had to make twice.
 */
const DELIBERATELY_KEPT = [
  'ProjectLog', // team's work product; `createdByUserId` is attribution
  'DiscoveryNode', // ditto, and the tree is shared
  'DiscoverySourceVisit', // the team's once-ever KP claim for a source (P1-S14)
  'SynthesisMatrix',
  'Experiment',
  'TeamShopBuilding',
  'TeamRubricScore',
  'TeacherFeedback', // the teacher's record, not the student's row
  'UploadedAsset', // the ledger that proves an R2 object exists (P1-R12)
  'TeamMembershipEvent', // append-only authorization log
  'TeamMember', // retired through `departTeam`, not deleted here
  'AiUsage', // spend accounting; nullable attribution, no content
  'IdeaCheck',
]

describe('per-student data inventory', () => {
  it('names only models and columns that exist in the schema', () => {
    for (const entry of PER_STUDENT_INVENTORY) {
      const fields = fieldsOf(modelName(entry.model))
      expect(fields, `model ${entry.model} is not in schema.prisma`).not.toBeNull()
      expect(fields, `${entry.model}.${entry.column} is not in schema.prisma`).toContain(
        entry.column,
      )
    }
  })

  it('has unique keys and unique models', () => {
    const keys = PER_STUDENT_INVENTORY.map((e) => e.key)
    const models = PER_STUDENT_INVENTORY.map((e) => e.model)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(models).size).toBe(models.length)
  })

  it('does not erase anything on the deliberately-kept list', () => {
    const erased = new Set(PER_STUDENT_INVENTORY.map((e) => modelName(e.model)))
    for (const kept of DELIBERATELY_KEPT) {
      expect(fieldsOf(kept), `${kept} vanished from the schema`).not.toBeNull()
      expect(erased.has(kept), `${kept} moved into the erasure inventory`).toBe(false)
    }
  })

  it('the `users` row is tombstoned, not dropped — the column exists to prove it', () => {
    expect(fieldsOf('User')).toContain('deletedAt')
    expect(erasedModelNames()).not.toContain('User')
  })
})

function erasedModelNames(): string[] {
  return PER_STUDENT_INVENTORY.map((e) => modelName(e.model))
}
