import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `lib/research-plan/claim.ts` — the only claim site in the repo without a
 * dedicated test (cf. `advance-phase-claim`, `quiz-retry-concurrency`,
 * `fair-sync-claim`, `followup-claim`, `codex-complete-monotonic`).
 * `test/paid-plan-writeback.test.ts` stubs `updateMany → { count: 1 }` and only
 * inspects the release payload, so nothing exercised the predicate itself.
 *
 * It gates the two most expensive Claude calls in the app, for both callers:
 *  - break the `{ [field]: { lt: stale } }` clause and a crashed run wedges the
 *    team for the full 5 minutes (or forever, if the reclaim never fires);
 *  - break `count !== 1` and two runs both pay — and `idea-check-service`'s
 *    daily cap is only exact WHILE the claim is held, so the cap goes with it;
 *  - break the release `where` and one team's release frees another's claim.
 *
 * The store below is driven by the REAL `where`, so every clause is executed.
 */

interface PlanRow {
  teamId: string
  reviewClaimedAt: Date | null
  ideaCheckClaimedAt: Date | null
}

let plans: PlanRow[]

vi.mock('server-only', () => ({}))

function matches(row: PlanRow, where: any): boolean {
  for (const [field, cond] of Object.entries(where ?? {})) {
    if (field === 'OR') {
      if (!(cond as any[]).some((c) => matches(row, c))) return false
      continue
    }
    const actual = (row as any)[field]
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as any
      if (c.lt !== undefined && !(actual !== null && actual < c.lt)) return false
      continue
    }
    // Dates compare by value, not identity — a fresh Date object holding the
    // same instant is the same stamp as far as Postgres is concerned.
    if (actual instanceof Date && cond instanceof Date) {
      if (actual.getTime() !== cond.getTime()) return false
      continue
    }
    if (actual !== cond) return false
  }
  return true
}

vi.mock('@/lib/db', () => ({
  db: {
    researchPlan: {
      updateMany: async ({ where, data }: any) => {
        const hits = plans.filter((p) => matches(p, where))
        for (const p of hits) Object.assign(p, data)
        return { count: hits.length }
      },
    },
  },
}))

const { claimPlanWork, PLAN_CLAIM_TTL_MS } = await import('@/lib/research-plan/claim')

const plan = (teamId: string, overrides: Partial<PlanRow> = {}): PlanRow => ({
  teamId,
  reviewClaimedAt: null,
  ideaCheckClaimedAt: null,
  ...overrides,
})

beforeEach(() => {
  plans = [plan('team_1')]
})

describe('claiming a paid plan workflow', () => {
  it('stamps a free slot and hands back a release', async () => {
    const claim = await claimPlanWork('team_1', 'reviewClaimedAt')

    expect(claim).not.toBeNull()
    expect(plans[0]!.reviewClaimedAt).toBeInstanceOf(Date)
  })

  it('refuses a slot another live run already holds', async () => {
    plans[0]!.reviewClaimedAt = new Date()

    expect(await claimPlanWork('team_1', 'reviewClaimedAt')).toBeNull()
  })

  it('two concurrent claims: exactly one wins', async () => {
    const [a, b] = await Promise.all([
      claimPlanWork('team_1', 'reviewClaimedAt'),
      claimPlanWork('team_1', 'reviewClaimedAt'),
    ])

    expect([a, b].filter(Boolean)).toHaveLength(1)
  })

  it('RECLAIMS a stamp older than the TTL — a crashed run cannot wedge the team', async () => {
    plans[0]!.reviewClaimedAt = new Date(Date.now() - PLAN_CLAIM_TTL_MS - 1_000)

    const claim = await claimPlanWork('team_1', 'reviewClaimedAt')

    expect(claim).not.toBeNull()
    expect(plans[0]!.reviewClaimedAt!.getTime()).toBeGreaterThan(Date.now() - 1_000)
  })

  it('does NOT reclaim a stamp still inside the TTL', async () => {
    plans[0]!.reviewClaimedAt = new Date(Date.now() - PLAN_CLAIM_TTL_MS + 30_000)

    expect(await claimPlanWork('team_1', 'reviewClaimedAt')).toBeNull()
  })

  it('the two fields are independent slots', async () => {
    plans[0]!.reviewClaimedAt = new Date()

    expect(await claimPlanWork('team_1', 'ideaCheckClaimedAt')).not.toBeNull()
    expect(plans[0]!.reviewClaimedAt).not.toBeNull() // untouched
  })

  it('returns null rather than a claim when NO row matched (no plan for this team)', async () => {
    // `count !== 1`, not `count === 0` — a caller handed a live claim it never
    // took would release someone else's stamp on failure.
    expect(await claimPlanWork('team_missing', 'reviewClaimedAt')).toBeNull()
  })

  it('returns null when the predicate matched more than one row', async () => {
    // A `where` that lost its `teamId` would match every team's plan. The
    // claim must refuse rather than hand out a release keyed on a stamp it
    // shares with rows it does not own.
    plans.push(plan('team_1')) // duplicate rows for one team
    expect(await claimPlanWork('team_1', 'reviewClaimedAt')).toBeNull()
  })
})

describe('releasing a claim', () => {
  it('clears the slot so the next run does not wait out the TTL', async () => {
    const claim = await claimPlanWork('team_1', 'reviewClaimedAt')
    await claim!.release()

    expect(plans[0]!.reviewClaimedAt).toBeNull()
    expect(await claimPlanWork('team_1', 'reviewClaimedAt')).not.toBeNull()
  })

  it('releases only the stamp it owns — a stale release cannot free a newer claim', async () => {
    // THE ATTACK: run A claims, stalls past the TTL, run B reclaims, then A
    // finally fails and calls release. Keyed on `{ teamId, [field]: stamp }`,
    // A's release matches nothing and B keeps its slot. Keyed on `teamId`
    // alone, A frees B's claim mid-call and a third run pays again.
    //
    // Real time is moved rather than the row rewritten: the stamp IS
    // `new Date()`, so two claims manufactured inside the same millisecond
    // would share it and the test would be measuring clock resolution instead
    // of the `where`. The TTL is what keeps two live stamps 5 minutes apart in
    // production, so the test reproduces that gap honestly.
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-07-27T10:00:00Z'))
      const a = await claimPlanWork('team_1', 'reviewClaimedAt')

      vi.setSystemTime(new Date(Date.now() + PLAN_CLAIM_TTL_MS + 1_000))
      const b = await claimPlanWork('team_1', 'reviewClaimedAt')
      expect(b).not.toBeNull()
      const bStamp = plans[0]!.reviewClaimedAt

      await a!.release()

      expect(plans[0]!.reviewClaimedAt).toBe(bStamp)
      expect(await claimPlanWork('team_1', 'reviewClaimedAt')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('releases only its own TEAM — another team keeps its claim', async () => {
    plans.push(plan('team_2'))
    const mine = await claimPlanWork('team_1', 'reviewClaimedAt')
    await claimPlanWork('team_2', 'reviewClaimedAt')

    await mine!.release()

    expect(plans[0]!.reviewClaimedAt).toBeNull()
    expect(plans[1]!.reviewClaimedAt).not.toBeNull()
  })

  it('swallows a failed release — the TTL is the real guarantee', async () => {
    const claim = await claimPlanWork('team_1', 'reviewClaimedAt')
    const { db } = (await import('@/lib/db')) as any
    const real = db.researchPlan.updateMany
    db.researchPlan.updateMany = async () => {
      throw new Error('connection reset')
    }
    try {
      await expect(claim!.release()).resolves.toBeUndefined()
    } finally {
      db.researchPlan.updateMany = real
    }
  })
})
