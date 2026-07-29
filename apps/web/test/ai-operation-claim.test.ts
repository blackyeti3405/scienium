import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

/**
 * Claim fencing for paid provider calls (REFACTOR2 P1-1).
 *
 * `runAiOperation` used status as the stale-takeover comparison. A stale
 * operation goes `running` → `running`, so an `updateMany` guarded on status
 * matched for BOTH takers and both paid Anthropic. Success and failure writes
 * were keyed on the row id alone, so a worker that came back after its lease
 * expired overwrote the result of whoever had replaced it.
 *
 * These tests run against an in-memory store that honours the WHERE clause —
 * mocking `updateMany` to a fixed count would pass no matter what the predicate
 * says, which is precisely the bug.
 */

interface Row {
  id: string
  operation: string
  idempotencyKey: string
  status: 'running' | 'succeeded' | 'failed'
  claimToken: string
  resultJson: unknown
  createdAt: Date
  completedAt: Date | null
}

const store = vi.hoisted(() => {
  const rows = new Map<string, Record<string, unknown>>()
  /** Lets a test hold one write open while another worker races it. */
  const hooks: { beforeUpdateMany?: () => Promise<void> } = {}
  let seq = 0

  const matches = (row: Record<string, unknown>, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => row[k] === v)

  return {
    rows,
    hooks,
    reset() {
      rows.clear()
      seq = 0
      delete hooks.beforeUpdateMany
    },
    client: {
      // `@@unique([operation, idempotencyKey])`, enforced the way Prisma does.
      async create({ data }: { data: Record<string, unknown> }) {
        for (const row of rows.values()) {
          if (row.operation === data.operation && row.idempotencyKey === data.idempotencyKey) {
            throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
          }
        }
        const id = `op_${++seq}`
        rows.set(id, {
          id,
          teamId: null,
          status: 'running',
          claimToken: '',
          resultJson: null,
          createdAt: new Date(),
          completedAt: null,
          ...data,
        })
        return { id }
      },
      async findUnique({
        where,
      }: {
        where: { operation_idempotencyKey: { operation: string; idempotencyKey: string } }
      }) {
        const { operation, idempotencyKey } = where.operation_idempotencyKey
        for (const row of rows.values()) {
          // A COPY: a worker that read before a racing write keeps seeing the
          // identity it read, exactly as a real query would.
          if (row.operation === operation && row.idempotencyKey === idempotencyKey) return { ...row }
        }
        return null
      },
      async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        await hooks.beforeUpdateMany?.()
        let count = 0
        for (const row of rows.values()) {
          if (!matches(row, where)) continue
          for (const [k, v] of Object.entries(data)) row[k] = v === Prisma.DbNull ? null : v
          count++
        }
        return { count }
      },
    },
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ db: { aiOperation: store.client } }))

import { aiIdempotencyKey, runAiOperation } from '@/lib/ai/operation'

const KEY = aiIdempotencyKey(['claim', 'fixture'])
const OP = 'explain_grade' as const
const DEAD = 'token_of_the_dead_worker'

/** The single row under test, live (not a copy). */
const only = () => [...store.rows.values()][0] as unknown as Row

/** A `running` row whose owner never came back — past the 3-minute lease. */
function seedStale() {
  store.rows.set('op_stale', {
    id: 'op_stale',
    operation: OP,
    idempotencyKey: KEY,
    teamId: null,
    status: 'running',
    claimToken: DEAD,
    resultJson: null,
    createdAt: new Date(Date.now() - 10 * 60_000),
    completedAt: null,
  })
}

/** A promise plus its resolver, for holding a worker inside `run`. */
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => store.reset())

describe('stale takeover admits exactly one worker', () => {
  it('two workers that both read the same dead claim make one paid call', async () => {
    seedStale()

    // Both read the stale row before either writes, and the first taker's write
    // is held open until the second has raced it. `running` is true for both —
    // only the claim token can tell them apart.
    const gate = deferred<void>()
    let held = false
    store.hooks.beforeUpdateMany = async () => {
      if (held) return
      held = true
      await gate.promise
    }

    // Both workers hold their call open, so the loser's takeover lands while the
    // winner is STILL `running` — the exact state a status-only guard cannot
    // distinguish from the dead claim both of them read.
    const workA = deferred<string>()
    const workB = deferred<string>()
    const runA = vi.fn(() => workA.promise)
    const runB = vi.fn(() => workB.promise)
    const a = runAiOperation({ operation: OP, idempotencyKey: KEY, run: runA })
    const b = runAiOperation({ operation: OP, idempotencyKey: KEY, run: runB })

    await flush() // the un-held worker claims and is now inside its paid call
    gate.resolve()
    await flush() // the held worker's compare-and-set lands against a `running` row

    const paid = runA.mock.calls.length === 1 ? 'A' : 'B'
    expect(runA.mock.calls.length + runB.mock.calls.length).toBe(1)

    workA.resolve('A')
    workB.resolve('B')
    const outcomes = [await a, await b]

    expect(outcomes.filter((o) => o.ok)).toHaveLength(1)
    expect(outcomes.filter((o) => !o.ok && o.reason === 'in_flight')).toHaveLength(1)

    // The winner owns the row outright: its result is stored, and the dead
    // worker's token is gone rather than being matched a second time.
    expect(only().status).toBe('succeeded')
    expect(only().resultJson).toBe(paid)
    expect(only().claimToken).not.toBe(DEAD)
  })
})

describe('a replaced worker cannot alter the new owner’s state', () => {
  /**
   * Worker A claims, then stalls past its lease so the row can be taken over.
   * Every A write from that point on must be a no-op.
   */
  async function stallPastLease(aRun: Promise<string>) {
    const a = runAiOperation({ operation: OP, idempotencyKey: KEY, run: () => aRun })
    await flush()
    const aToken = only().claimToken
    only().createdAt = new Date(Date.now() - 10 * 60_000)
    return { a, aToken }
  }

  it('a late success write cannot overwrite the new owner’s stored result', async () => {
    const aRun = deferred<string>()
    const { a, aToken } = await stallPastLease(aRun.promise)

    const b = await runAiOperation({ operation: OP, idempotencyKey: KEY, run: async () => 'B result' })
    expect(b).toEqual({ ok: true, result: 'B result', replayed: false })
    const bToken = only().claimToken
    expect(bToken).not.toBe(aToken)

    // A returns AFTER the new owner settled.
    aRun.resolve('A result')
    expect(await a).toEqual({ ok: false, reason: 'in_flight' })
    expect(only().status).toBe('succeeded')
    expect(only().resultJson).toBe('B result')
    expect(only().claimToken).toBe(bToken)
  })

  it('a late failure write cannot fail a row the new owner is still running', async () => {
    const aRun = deferred<string>()
    const { a, aToken } = await stallPastLease(aRun.promise)

    // B claims but has NOT settled — the row is `running` under B's token.
    const bRun = deferred<string>()
    const b = runAiOperation({ operation: OP, idempotencyKey: KEY, run: () => bRun.promise })
    await flush()
    const bToken = only().claimToken
    expect(bToken).not.toBe(aToken)

    // A returns BEFORE the new owner settles, and fails. The row is not A's to
    // mark failed — doing so would invite a third worker to take it over while
    // B is still paying for it.
    aRun.reject(new Error('provider down'))
    expect(await a).toEqual({ ok: false, reason: 'in_flight' })
    expect(only().status).toBe('running')
    expect(only().claimToken).toBe(bToken)

    bRun.resolve('B result')
    expect(await b).toEqual({ ok: true, result: 'B result', replayed: false })
    expect(only().status).toBe('succeeded')
    expect(only().resultJson).toBe('B result')
  })

  it('a late success write cannot resurrect a row the new owner already failed', async () => {
    const aRun = deferred<string>()
    const { a } = await stallPastLease(aRun.promise)

    const b = await runAiOperation({
      operation: OP,
      idempotencyKey: KEY,
      run: async () => {
        throw new Error('provider down')
      },
    })
    expect(b.ok).toBe(false)
    expect(only().status).toBe('failed')
    const bToken = only().claimToken

    aRun.resolve('A result')
    expect(await a).toEqual({ ok: false, reason: 'in_flight' })
    expect(only().status).toBe('failed')
    expect(only().resultJson).toBeNull()
    expect(only().claimToken).toBe(bToken)
  })
})
