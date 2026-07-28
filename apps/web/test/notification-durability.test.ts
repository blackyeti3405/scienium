import { beforeEach, describe, expect, it, vi } from 'vitest'
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
 * commits in that event's transaction. Three things follow:
 *
 *   1. the write goes through the caller's `tx`, never the global client —
 *      EXECUTED below against the real removal path, because until v0.75.10
 *      this file tested everything about the headline except the headline;
 *   2. no notification write may swallow its own failure;
 *   3. `dedupeKey` is globally unique, so a key that is not unique BY
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

const lineOf = (src: string, index: number) => src.slice(0, index).split('\n').length

// ── The executable half ───────────────────────────────────────────────────────
//
// `removeMember` is the shortest real path with a notice in it: the notification
// is written mid-transaction (`lib/team/membership.ts`), and three more writes
// follow it. The fake below is the only thing in the suite that models ROLLBACK —
// `tx` writes are staged and only merged on a clean return, and the global `db`
// commits immediately, which is precisely the difference between the two clients
// that `$transaction: (fn) => fn(db)` (every other file here) cannot see.

interface Row {
  table: string
  data: Record<string, unknown>
}

let committed: Row[]
let staged: Row[]
/** Set to make the LAST write of the removal transaction fail. */
let failLateWrite: boolean

const stage = (table: string, data: Record<string, unknown>) => {
  staged.push({ table, data })
  return { id: `${table}_${staged.length}`, ...data }
}

const tx = {
  team: {
    findUnique: async ({ where }: any) =>
      where.id === 'team_1' ? { teamLeadId: 'lead_1', archivedAt: null, name: 'Volt Lab' } : null,
    update: async () => ({}),
    updateMany: async () => ({ count: 1 }),
  },
  teamMember: {
    findUnique: async () => ({ role: 'member' }),
    delete: async () => ({}),
    findMany: async () => [{ userId: 'lead_1' }],
    update: async () => ({}),
  },
  teamMembershipEvent: {
    create: async ({ data }: any) => stage('teamMembershipEvent', data),
  },
  teamInvite: { deleteMany: async () => ({ count: 0 }) },
  notification: {
    create: async ({ data }: any) => stage('notification', data),
  },
  user: {
    updateMany: async () => {
      // The removal's last write. A serialization failure, a deadlock, or any
      // later guard throwing here rolls the WHOLE transaction back — including
      // the notice, if the notice was written into it.
      if (failLateWrite) throw new Error('could not serialize access')
      return { count: 1 }
    },
  },
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: async () => {} }))
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
      staged = []
      try {
        const out = await fn(tx)
        committed.push(...staged)
        return out
      } finally {
        staged = []
      }
    },
    // A write through the GLOBAL client runs in its own implicit transaction and
    // is durable the instant it returns — no staging, nothing to roll back.
    notification: {
      create: async ({ data }: any) => {
        committed.push({ table: 'notification', data })
        return data
      },
    },
  },
}))

const { removeMember } = await import('@/lib/team/membership')

const notices = () => committed.filter((r) => r.table === 'notification')

beforeEach(() => {
  committed = []
  staged = []
  failLateWrite = false
})

describe('a user-facing notice is as durable as the thing it announces', () => {
  it('a removal that commits tells the removed member (non-vacuity)', async () => {
    await removeMember('team_1', 'lead_1', 'member_1')

    expect(notices()).toHaveLength(1)
    expect(notices()[0]!.data).toMatchObject({
      userId: 'member_1',
      kind: 'membership_changed',
      dedupeKey: 'team_removed:teamMembershipEvent_1',
    })
  })

  it('THE ATTACK: a notice whose removal rolls back does not exist', async () => {
    failLateWrite = true

    await expect(removeMember('team_1', 'lead_1', 'member_1')).rejects.toThrow(
      'could not serialize access',
    )

    // Written through the global client instead of `tx` — which typechecks, and
    // which no other test in the suite can distinguish — this row survives the
    // rollback: a student who is still in the lab, told they were removed from
    // it, with a `/onboarding` link. The membership event rolls back either way,
    // so asserting on the event alone would prove nothing.
    expect(notices()).toEqual([])
    expect(committed).toEqual([])
  })
})

describe('the same rule, swept across every notification write', () => {
  it('no notification is written through the global client', () => {
    // The shape the type system cannot see, and the sibling line to
    // `activity-durability.test.ts`'s `recordActivity\((db|prisma),`: a notice
    // written on `db` inside a transaction-taking function commits on its own.
    const outsideTx: string[] = []
    for (const { path, src } of sourceFiles()) {
      for (const m of src.matchAll(/\b(?:db|prisma)\.notification\.create(?:Many)?\(/g)) {
        outsideTx.push(`${path}:${lineOf(src, m.index)}`)
      }
    }
    expect(outsideTx.sort()).toEqual([])
  })

  it('no notification write swallows its own failure', () => {
    const swallowed: string[] = []
    for (const { path, src } of sourceFiles()) {
      // `…notification.create({...}).catch(...)` across any amount of
      // whitespace/formatting — the `.catch` is the tell, wherever prettier put
      // it. `createMany` is included: the cron writes the bell in bulk, and the
      // original pattern here matched only `create(`.
      for (const m of src.matchAll(/notification\.create(?:Many)?\([\s\S]*?\)\s*\.catch\(/g)) {
        swallowed.push(`${path}:${lineOf(src, m.index)}`)
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
        clockKeyed.push(`${path}:${lineOf(src, m.index)}`)
      }
    }
    expect(clockKeyed.sort()).toEqual([])
  })
})
