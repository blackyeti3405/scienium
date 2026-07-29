import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R9 — export and erasure as a durable workflow.
 *
 * The replaced procedure was a runbook: an operator, psql, and a list of tables
 * to get right every time. These tests pin the three properties that make this a
 * workflow instead:
 *
 *  - Filing is IDEMPOTENT per subject/kind/day, so a double click is one erasure.
 *  - The claim is FENCED, so two overlapping crons cannot both erase.
 *  - Each external system is a STEP, so a resumed run does not re-delete a Clerk
 *    identity it already deleted, and cannot silently skip storage retirement.
 *
 * Plus the property the whole design turns on: erasure TOMBSTONES the `users`
 * row rather than dropping it, because team-shared work carries a required FK to
 * it — and a tombstone that leaves the name and email behind is not an erasure.
 *
 * P1-2 finishes the fence. The claim wrote a token, but the claimed value did
 * not carry it and no step, terminal, or release write checked it — so a worker
 * whose lease expired mid-erasure could still mark steps done and report a
 * completion the new owner was in the middle of performing.
 */

interface RequestRow {
  id: string
  kind: string
  subjectUserId: string
  subjectClerkUserId: string
  subjectEmail: string
  requestedByUserId: string
  requestKey: string
  status: string
  claimToken: string | null
  claimedAt: Date | null
  completedAt: Date | null
  decidedAt: Date | null
  decidedNote: string | null
  attempts: number
  lastError: string | null
  resultJson: unknown
  createdAt: Date
}

interface StepRow {
  id: string
  requestId: string
  target: string
  status: string
  attempts: number
  detail: unknown
  lastError: string | null
  completedAt: Date | null
}

let requests: RequestRow[]
let steps: StepRow[]
let users: { id: string; clerkUserId: string; email: string; name: string; deletedAt: Date | null }[]
let memberships: { teamId: string; userId: string }[]
let assets: { id: string; userId: string; status: string }[]
let clerkDeletes: string[]
let departures: { teamId: string; userId: string; reason: string }[]
let deletedRows: string[]
let putObjects: { key: string; bytes: number }[]
let clerkError: { status?: number } | null

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({
    users: {
      deleteUser: async (id: string) => {
        if (clerkError) throw clerkError
        clerkDeletes.push(id)
      },
    },
  }),
}))

/** When held, the export step parks in `heldPuts` until a test releases it —
 *  a worker frozen inside a step, which is where a lease expires. */
const putGate = { hold: false }
const heldPuts: Array<{ finish: () => void; fail: (e: unknown) => void }> = []

vi.mock('@/lib/storage', () => ({
  putObject: async (key: string, body: Buffer) => {
    putObjects.push({ key, bytes: body.byteLength })
    if (putGate.hold) {
      await new Promise<void>((finish, fail) => heldPuts.push({ finish, fail }))
    }
  },
}))

vi.mock('@/lib/team/membership', () => ({
  departTeam: async (_tx: unknown, input: { teamId: string; userId: string; reason: string }) => {
    departures.push(input)
    memberships = memberships.filter(
      (m) => !(m.teamId === input.teamId && m.userId === input.userId),
    )
    return { archived: false, newLeadUserId: null }
  },
}))

vi.mock('@/lib/data-requests/inventory', () => ({
  collectSubjectRows: async (userId: string) => ({ vocab_cards: [{ id: 'c1', userId }] }),
  deleteSubjectRows: async (_tx: unknown, userId: string) => {
    deletedRows.push(userId)
    return { vocab_cards: 1 }
  },
}))

let nextId = 0
const newId = () => `id${++nextId}`

/**
 * A dumb row store: every clause is read off the REAL `where` the production
 * code passes. Nothing here knows what "approved" means — an earlier version
 * reimplemented the selection predicate, so changing `workflow.ts` to run
 * unapproved erasures left the suite green. Same shape as
 * `test/notification-outbox.test.ts`'s matcher.
 */
function matchesRequest(r: RequestRow, where: any): boolean {
  for (const [field, cond] of Object.entries(where ?? {})) {
    if (field === 'OR') {
      if (!(cond as any[]).some((c) => matchesRequest(r, c))) return false
      continue
    }
    const actual = (r as any)[field]
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as any
      if (c.in !== undefined && !c.in.includes(actual)) return false
      if (c.notIn !== undefined && c.notIn.includes(actual)) return false
      if (c.not !== undefined && actual === c.not) return false
      if (c.lt !== undefined && !(actual !== null && actual < c.lt)) return false
      if (c.gt !== undefined && !(actual !== null && actual > c.gt)) return false
      continue
    }
    if (actual !== cond) return false
  }
  return true
}

vi.mock('@/lib/db', () => {
  const db = {
    dataRequest: {
      findUnique: async ({ where }: any) =>
        requests.find((r) => (where.id ? r.id === where.id : r.requestKey === where.requestKey)) ??
        null,
      create: async ({ data }: any) => {
        if (requests.some((r) => r.requestKey === data.requestKey)) throw new Error('P2002')
        const row: RequestRow = {
          id: newId(),
          status: 'requested',
          claimToken: null,
          claimedAt: null,
          completedAt: null,
          decidedAt: null,
          decidedNote: null,
          attempts: 0,
          lastError: null,
          resultJson: null,
          createdAt: new Date(),
          ...data,
        }
        requests.push(row)
        return row
      },
      findMany: async ({ where, take }: any) => {
        const hits = requests.filter((r) => matchesRequest(r, where))
        return (take ? hits.slice(0, take) : hits).map((r) => ({ ...r }))
      },
      updateMany: async ({ where, data }: any) => {
        const hits = requests.filter((r) => matchesRequest(r, where))
        for (const r of hits) {
          for (const [k, v] of Object.entries(data)) {
            if (v && typeof v === 'object' && 'increment' in v) {
              ;(r as any)[k] += (v as any).increment
            } else {
              ;(r as any)[k] = v
            }
          }
        }
        return { count: hits.length }
      },
    },
    dataRequestStep: {
      upsert: async ({ where, create }: any) => {
        const key = where.requestId_target
        let row = steps.find((s) => s.requestId === key.requestId && s.target === key.target)
        if (!row) {
          row = {
            id: newId(),
            status: 'pending',
            attempts: 0,
            detail: null,
            lastError: null,
            completedAt: null,
            ...create,
          }
          steps.push(row!)
        }
        return { ...row! }
      },
      update: async ({ where, data }: any) => {
        const row = steps.find((s) => s.id === where.id)!
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && 'increment' in v) {
            ;(row as any)[k] += (v as any).increment
          } else {
            ;(row as any)[k] = v
          }
        }
        return { ...row }
      },
      /**
       * Honours the RELATION clause the fence relies on: a step is only writable
       * while its parent request still carries the writer's claim token. The
       * predicate is read off the real `where`, so removing it from
       * `workflow.ts` changes what this matches.
       */
      updateMany: async ({ where, data }: any) => {
        const hits = steps.filter((s) => {
          if (where.id !== undefined && s.id !== where.id) return false
          if (where.request !== undefined) {
            const parent = requests.find((r) => r.id === s.requestId)
            if (!parent || !matchesRequest(parent, where.request)) return false
          }
          return true
        })
        for (const s of hits) {
          for (const [k, v] of Object.entries(data)) {
            if (v && typeof v === 'object' && 'increment' in v) {
              ;(s as any)[k] += (v as any).increment
            } else {
              ;(s as any)[k] = v
            }
          }
        }
        return { count: hits.length }
      },
    },
    user: {
      findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const u = users.find((x) => x.id === where.id)!
        Object.assign(u, data)
        return { ...u }
      },
    },
    teamMember: {
      findMany: async ({ where }: any) => memberships.filter((m) => m.userId === where.userId),
    },
    uploadedAsset: {
      updateMany: async ({ where, data }: any) => {
        const hits = assets.filter((a) => a.userId === where.userId && a.status === where.status)
        for (const a of hits) a.status = data.status
        return { count: hits.length }
      },
    },
    $transaction: async (fn: any) => fn(db),
  }
  return { db }
})

const { fileDataRequest, decideDataRequest, requestKeyFor, runDataRequests } = await import(
  '@/lib/data-requests/workflow'
)
const { logEvent } = await import('@/lib/observability/log')

/** Lets the suspended worker's continuation run before the assertions. */
const flush = () => new Promise((r) => setTimeout(r, 0))
/** A worker that expired and wrote nothing announces itself here. */
const claimLost = () =>
  vi.mocked(logEvent).mock.calls.filter((c) => c[0]?.event === 'data_request.claim_lost')

const SUBJECT = { id: 'u1', clerkUserId: 'clerk_u1', email: 'a@example.com' }

async function file(kind: 'export' | 'delete', now?: Date) {
  return fileDataRequest({ kind, subject: SUBJECT, requestedByUserId: SUBJECT.id, now })
}

beforeEach(() => {
  requests = []
  steps = []
  users = [{ ...SUBJECT, name: 'Ada', deletedAt: null }]
  memberships = [{ teamId: 't1', userId: 'u1' }]
  assets = [
    { id: 'a-temp', userId: 'u1', status: 'temporary' },
    { id: 'a-attached', userId: 'u1', status: 'attached' },
  ]
  clerkDeletes = []
  departures = []
  deletedRows = []
  putObjects = []
  clerkError = null
  nextId = 0
  putGate.hold = false
  heldPuts.length = 0
  vi.mocked(logEvent).mockClear()
})

describe('filing a request', () => {
  it('is idempotent within a UTC day and distinct across days and kinds', async () => {
    const day1 = new Date('2026-07-26T01:00:00Z')
    const first = await file('delete', day1)
    const again = await file('delete', new Date('2026-07-26T23:00:00Z'))
    expect(again.id).toBe(first.id)
    expect(requests).toHaveLength(1)

    await file('delete', new Date('2026-07-27T01:00:00Z'))
    await file('export', day1)
    expect(requests).toHaveLength(3)

    expect(requestKeyFor('delete', 'u1', day1)).not.toBe(requestKeyFor('export', 'u1', day1))
    expect(requestKeyFor('delete', 'u1', day1)).not.toBe(requestKeyFor('delete', 'u2', day1))
  })

  it('files as `requested`, not approved — nothing runs until an operator says so', async () => {
    const filed = await file('delete')
    expect(filed.status).toBe('requested')

    await runDataRequests(10)

    expect(clerkDeletes).toEqual([])
    expect(deletedRows).toEqual([])
    expect(users[0]!.deletedAt).toBeNull()
    // The drain did not even CLAIM it: `requested` is outside the selection
    // predicate, not merely short-circuited somewhere later.
    expect(requests[0]!.status).toBe('requested')
    expect(requests[0]!.attempts).toBe(0)
  })

  it('a decision is a CAS — the second operator loses instead of overwriting', async () => {
    const filed = await file('delete')
    expect(await decideDataRequest(filed.id, 'approve')).toBe(true)
    expect(await decideDataRequest(filed.id, 'reject')).toBe(false)
    expect(requests[0]!.status).toBe('approved')
  })
})

describe('the worker', () => {
  it('fences the claim: a concurrent run finds nothing to take', async () => {
    const filed = await file('delete')
    await decideDataRequest(filed.id, 'approve')

    const [a, b] = await Promise.all([runDataRequests(10), runDataRequests(10)])

    expect(a.completed + b.completed).toBe(1)
    expect(clerkDeletes).toEqual(['clerk_u1'])
    expect(deletedRows).toEqual(['u1'])
  })

  it('erases: identity blanked, membership departed, per-student rows deleted', async () => {
    const filed = await file('delete')
    await decideDataRequest(filed.id, 'approve')

    await runDataRequests(10)

    const user = users[0]!
    expect(user.deletedAt).not.toBeNull()
    expect(user.name).toBe('Deleted student')
    expect(user.email).not.toContain('a@example.com')
    expect(user.clerkUserId).not.toBe('clerk_u1')
    // `departTeam` is MOCKED here (see the `@/lib/team/membership` mock above), so
    // this pins only that erasure routes through the departure command with the
    // right arguments — lead handover and archiving are NOT exercised by this
    // file. They are owned by `test/team-membership-lifecycle.test.ts`.
    expect(departures).toEqual([
      { teamId: 't1', userId: 'u1', event: 'removed', actorUserId: null, reason: 'data_erasure' },
    ])
    expect(requests[0]!.status).toBe('completed')
  })

  it('retires unbound uploads only — attached assets stay with the team', async () => {
    const filed = await file('delete')
    await decideDataRequest(filed.id, 'approve')

    await runDataRequests(10)

    expect(assets.find((a) => a.id === 'a-temp')!.status).toBe('orphaned')
    expect(assets.find((a) => a.id === 'a-attached')!.status).toBe('attached')
  })

  it('resumes without re-running a finished step', async () => {
    const filed = await file('delete')
    await decideDataRequest(filed.id, 'approve')

    // First pass dies after Clerk: the postgres step throws.
    const { db } = (await import('@/lib/db')) as any
    const realUpdate = db.user.update
    db.user.update = async () => {
      throw new Error('connection reset')
    }
    await runDataRequests(10)
    expect(clerkDeletes).toEqual(['clerk_u1'])
    expect(requests[0]!.status).toBe('approved') // released for another run
    db.user.update = realUpdate

    await runDataRequests(10)

    // Clerk was NOT deleted a second time; the erasure still completed.
    expect(clerkDeletes).toEqual(['clerk_u1'])
    expect(users[0]!.deletedAt).not.toBeNull()
    expect(requests[0]!.status).toBe('completed')
  })

  it('treats an already-absent Clerk identity as done, not as a failure', async () => {
    const filed = await file('delete')
    await decideDataRequest(filed.id, 'approve')
    clerkError = { status: 404 }

    const result = await runDataRequests(10)

    expect(result.completed).toBe(1)
    expect(users[0]!.deletedAt).not.toBeNull()
  })

  it('parks a request after the attempt cap rather than retrying forever', async () => {
    const filed = await file('export')
    await decideDataRequest(filed.id, 'approve')
    const { db } = (await import('@/lib/db')) as any
    const realFind = db.user.findUnique
    db.user.findUnique = async () => {
      throw new Error('nope')
    }
    try {
      for (let i = 0; i < 4; i++) await runDataRequests(10)
    } finally {
      db.user.findUnique = realFind
    }
    expect(requests[0]!.status).toBe('failed')
    expect(requests[0]!.attempts).toBe(3)
  })

  it('a released request keeps its claim check — the release is fenced too', async () => {
    // The failing worker still owns the row here, so the release must land.
    const filed = await file('export')
    await decideDataRequest(filed.id, 'approve')
    const { db } = (await import('@/lib/db')) as any
    const realFind = db.user.findUnique
    db.user.findUnique = async () => {
      throw new Error('nope')
    }
    try {
      expect(await runDataRequests(10)).toEqual({ completed: 0, failed: 1 })
    } finally {
      db.user.findUnique = realFind
    }
    expect(requests[0]!.status).toBe('approved')
    expect(requests[0]!.claimToken).toBeNull()
    expect(claimLost()).toHaveLength(0)
  })

  it('writes the export bundle to storage rather than handing it to the browser', async () => {
    const filed = await file('export')
    await decideDataRequest(filed.id, 'approve')

    await runDataRequests(10)

    expect(putObjects).toHaveLength(1)
    expect(putObjects[0]!.key).toBe(`data-exports/${filed.id}.json`)
    expect(clerkDeletes).toEqual([])
    expect(users[0]!.deletedAt).toBeNull() // an export erases nothing
  })
})

describe('a replaced worker cannot alter the request it lost', () => {
  /**
   * Claim under worker A, then expire its lease while it sits inside its step.
   * Every A write from here on must be a no-op.
   */
  async function stallPastLease() {
    const filed = await file('export')
    await decideDataRequest(filed.id, 'approve')
    putGate.hold = true
    const a = runDataRequests(10)
    await flush()
    const aToken = requests[0]!.claimToken
    expect(aToken).not.toBeNull()
    expect(requests[0]!.status).toBe('running')
    requests[0]!.claimedAt = new Date(Date.now() - 20 * 60_000)
    return { a, aToken }
  }

  it('cannot complete a request the new owner is still running', async () => {
    const { a, aToken } = await stallPastLease()

    // B takes over and is itself inside the step: the request is `running` for
    // BOTH, which is exactly what a status-only predicate cannot separate.
    const b = runDataRequests(10)
    await flush()
    const bToken = requests[0]!.claimToken
    expect(bToken).not.toBe(aToken)

    heldPuts[0]!.finish() // A's step returns at last
    expect(await a).toEqual({ completed: 0, failed: 0 })
    expect(requests[0]!.status).toBe('running') // not A's completion to report
    expect(requests[0]!.claimToken).toBe(bToken)
    expect(requests[0]!.completedAt).toBeNull()
    expect(steps[0]!.status).toBe('pending') // nor A's step to mark done
    expect(claimLost()).toHaveLength(1)

    heldPuts[1]!.finish()
    expect(await b).toEqual({ completed: 1, failed: 0 })
    expect(requests[0]!.status).toBe('completed')
  })

  it('cannot re-record a step the new owner already finished', async () => {
    const { a } = await stallPastLease()

    // B takes over and runs the request all the way to `completed`.
    putGate.hold = false
    expect(await runDataRequests(10)).toEqual({ completed: 1, failed: 0 })
    expect(requests[0]!.status).toBe('completed')
    const owned = { detail: steps[0]!.detail, completedAt: steps[0]!.completedAt }
    const result = requests[0]!.resultJson

    // A returns long AFTER the worker that replaced it settled. The step row has
    // no status guard of its own — only the parent's claim token stands between
    // A and overwriting the evidence of what the new owner actually did.
    heldPuts[0]!.finish()
    expect(await a).toEqual({ completed: 0, failed: 0 })
    expect(steps[0]!.detail).toBe(owned.detail)
    expect(steps[0]!.completedAt).toBe(owned.completedAt)
    expect(steps[0]!.attempts).toBe(2) // A's own increment, before it lost the row
    expect(requests[0]!.resultJson).toBe(result)
    expect(requests[0]!.status).toBe('completed')
    expect(claimLost()).toHaveLength(1)
  })

  it('cannot release a request the new owner is mid-way through', async () => {
    const { a, aToken } = await stallPastLease()

    const b = runDataRequests(10)
    await flush()
    const bToken = requests[0]!.claimToken
    expect(bToken).not.toBe(aToken)

    // A's step FAILS after the takeover. Handing the row back to `approved`
    // would admit a third worker alongside the one still erasing.
    heldPuts[0]!.fail(new Error('storage reset'))
    expect(await a).toEqual({ completed: 0, failed: 1 })
    expect(requests[0]!.status).toBe('running')
    expect(requests[0]!.claimToken).toBe(bToken)
    expect(requests[0]!.lastError).toBeNull()
    expect(claimLost()).toHaveLength(1)

    heldPuts[1]!.finish()
    expect(await b).toEqual({ completed: 1, failed: 0 })
    expect(requests[0]!.status).toBe('completed')
  })

  it('cannot report a completion after losing the claim at the last moment', async () => {
    const filed = await file('export')
    await decideDataRequest(filed.id, 'approve')
    const { db } = (await import('@/lib/db')) as any
    const realUpdateMany = db.dataRequestStep.updateMany

    // Steal the row in the narrowest window there is: between the final step's
    // `done` write and the terminal write. The request is still `running` — for
    // the NEW owner — so nothing but the token can refuse this completion.
    db.dataRequestStep.updateMany = async (args: any) => {
      const out = await realUpdateMany(args)
      if (args.data?.status === 'done') requests[0]!.claimToken = 'a-newer-worker'
      return out
    }
    try {
      expect(await runDataRequests(10)).toEqual({ completed: 0, failed: 0 })
    } finally {
      db.dataRequestStep.updateMany = realUpdateMany
    }

    expect(steps[0]!.status).toBe('done') // the step it did own
    expect(requests[0]!.status).toBe('running') // but not the completion
    expect(requests[0]!.completedAt).toBeNull()
    expect(requests[0]!.resultJson).toBeNull()
    expect(requests[0]!.claimToken).toBe('a-newer-worker')
    expect(claimLost()).toHaveLength(1)
  })

  it('stops before the side effect rather than erasing under the new owner', async () => {
    // The delete path's steps are Clerk, storage, then postgres. A worker that
    // lost its claim between steps must not run the next one at all — an
    // erasure has no undo, and the new owner is already doing it.
    const filed = await file('delete')
    await decideDataRequest(filed.id, 'approve')
    const { db } = (await import('@/lib/db')) as any
    const realUpsert = db.dataRequestStep.upsert

    // Steal the row the moment A asks for its `storage` step.
    db.dataRequestStep.upsert = async (args: any) => {
      if (args.where.requestId_target.target === 'storage') {
        requests[0]!.claimToken = 'a-newer-worker'
      }
      return realUpsert(args)
    }
    try {
      expect(await runDataRequests(10)).toEqual({ completed: 0, failed: 0 })
    } finally {
      db.dataRequestStep.upsert = realUpsert
    }

    expect(clerkDeletes).toEqual(['clerk_u1']) // the step it still owned
    expect(assets.find((x) => x.id === 'a-temp')!.status).toBe('temporary') // not this one
    expect(deletedRows).toEqual([]) // and nothing was erased
    expect(users[0]!.deletedAt).toBeNull()
    expect(requests[0]!.status).toBe('running')
    expect(claimLost()).toHaveLength(1)
  })
})
