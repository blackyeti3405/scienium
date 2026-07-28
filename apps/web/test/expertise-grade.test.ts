import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `app/api/expertise/grade/route.ts` — the highest-value untested route in the
 * repo (audit §3). It mints 150–1200 KP and raises `TeamCurrency.clearanceLevel`,
 * which is the ceiling on the buildings shop, and it had ZERO tests of any kind.
 *
 * What is pinned here is the money path and the fence around the paid call:
 *
 *  - the 5-minute-TTL claim CAS (`active` → `grading`, stale claims stealable),
 *  - `releaseClaim()` on an AI failure, so a 502 leaves a retryable exam,
 *  - `mark.count === 0 → 409`, when a stale-recovered request took over mid-call,
 *  - and above all: the high-water `where: { clearanceLevel: { lt: targetLevel } }`
 *    guard and the `kp: { increment: kpBonus }` ride in the SAME `updateMany`.
 *
 * That last one is why `teamCurrency` below is a real row store that honours the
 * `lt` predicate rather than a recorder — decoupling the guard from the increment
 * is a one-line refactor that reads harmless and pays a team twice.
 */

interface ExamRow {
  [key: string]: unknown
  id: string
  userId: string
  teamId: string
  targetLevel: number
  status: string
  score: number | null
  passed: boolean | null
  gradedAt: Date | null
  gradingClaimedAt: Date | null
  gradingRequestId: string | null
  questionsJson: { id: string; prompt: string; key: string }[]
}

let exams: ExamRow[]
let currency: { teamId: string; clearanceLevel: number; kp: number }[]
let attempts: unknown[]
let activities: { action: string; detail: unknown }[]
/** Every `teamCurrency.updateMany` call, exactly as the route issued it. */
let raiseCalls: { where: any; data: any }[]

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  gradeAnswers: vi.fn(),
  getProjectContext: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/literature/grading', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  gradeAnswers: mocks.gradeAnswers,
}))
vi.mock('@/lib/clearance/rubric', () => ({ loadExpertiseRubric: async () => 'RUBRIC' }))
vi.mock('@/lib/clearance/context', () => ({
  getProjectContext: mocks.getProjectContext,
  renderProjectContext: () => 'context',
}))

/** Generic `where` matcher driven by the REAL clause the route passes. */
function matches(row: Record<string, unknown>, where: any): boolean {
  for (const [field, cond] of Object.entries(where ?? {})) {
    if (field === 'OR') {
      if (!(cond as any[]).some((c) => matches(row, c))) return false
      continue
    }
    const actual = row[field]
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as any
      if (c.in !== undefined && !c.in.includes(actual)) return false
      if (c.not !== undefined && actual === c.not) return false
      if (c.lt !== undefined && !(actual !== null && (actual as any) < c.lt)) return false
      continue
    }
    if (actual !== cond) return false
  }
  return true
}

function applyData(row: Record<string, unknown>, data: any): void {
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v && typeof v === 'object' && 'increment' in (v as object)) {
      row[k] = ((row[k] as number) ?? 0) + (v as { increment: number }).increment
    } else {
      row[k] = v
    }
  }
}

vi.mock('@/lib/activity/log', () => ({
  recordActivity: async (_tx: unknown, _t: string, _u: string, action: string, detail: unknown) => {
    activities.push({ action, detail })
  },
}))

vi.mock('@/lib/db', () => {
  const examDelegate = {
    findFirst: async ({ where }: any) => exams.find((e) => matches(e, where)) ?? null,
    updateMany: async ({ where, data }: any) => {
      const hits = exams.filter((e) => matches(e, where))
      for (const e of hits) applyData(e as unknown as Record<string, unknown>, data)
      return { count: hits.length }
    },
  }
  const currencyDelegate = {
    upsert: async ({ where, create }: any) => {
      const found = currency.find((c) => c.teamId === where.teamId)
      const row = found ?? { teamId: where.teamId, clearanceLevel: 0, kp: 0, ...create }
      if (!found) currency.push(row)
      return { ...row }
    },
    updateMany: async ({ where, data }: any) => {
      raiseCalls.push({ where, data })
      const hits = currency.filter((c) => matches(c as unknown as Record<string, unknown>, where))
      for (const c of hits) applyData(c as unknown as Record<string, unknown>, data)
      return { count: hits.length }
    },
    findUnique: async ({ where }: any) => currency.find((c) => c.teamId === where.teamId) ?? null,
  }
  const db = {
    expertiseExam: examDelegate,
    teamCurrency: currencyDelegate,
    expertiseAttempt: { createMany: async ({ data }: any) => attempts.push(...data) },
    $transaction: async (fn: any) => fn(db),
  }
  return { db }
})

const { POST } = await import('@/app/api/expertise/grade/route')
const { levelInfo } = await import('@/lib/clearance/expertise')

const QUESTIONS = [
  { id: 'q1', prompt: 'Why does this matter?', key: 'k1' },
  { id: 'q2', prompt: 'What is your variable?', key: 'k2' },
  { id: 'q3', prompt: 'How would you control it?', key: 'k3' },
]

/** Read from the config, so a re-tuned bonus does not need a test edit. */
const LEVEL_1_BONUS = levelInfo(1)!.kpBonus

function exam(overrides: Partial<ExamRow> = {}): ExamRow {
  return {
    id: 'exam_1',
    userId: 'user_1',
    teamId: 'team_1',
    targetLevel: 1,
    status: 'active',
    score: null,
    passed: null,
    gradedAt: null,
    gradingClaimedAt: null,
    gradingRequestId: null,
    questionsJson: QUESTIONS,
    ...overrides,
  }
}

function gradeReq(examId = 'exam_1'): NextRequest {
  return new NextRequest('http://app.example.com/api/expertise/grade', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      examId,
      answers: QUESTIONS.map((q) => ({ questionId: q.id, response: 'an answer' })),
    }),
  })
}

/** All questions graded at `score` — a pass at 90, a fail at 10. */
const verdict = (score: number) => ({
  ok: true as const,
  graded: QUESTIONS.map((q) => ({ questionId: q.id, score, rationale: 'because' })),
})

beforeEach(() => {
  vi.clearAllMocks()
  exams = [exam()]
  currency = [{ teamId: 'team_1', clearanceLevel: 0, kp: 0 }]
  attempts = []
  activities = []
  raiseCalls = []
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1' },
    error: null,
  })
  mocks.getProjectContext.mockResolvedValue({})
  mocks.gradeAnswers.mockResolvedValue(verdict(90))
})

describe('the claim fences the paid call', () => {
  it('claims `active` → `grading` BEFORE grading, stamped with this request', async () => {
    await POST(gradeReq())

    expect(mocks.gradeAnswers).toHaveBeenCalledOnce()
    // The claim landed and was then terminalized by the commit.
    expect(exams[0]!.status).toBe('graded')
    expect(exams[0]!.gradingRequestId).toBeNull()
  })

  it('refuses a second concurrent grade instead of paying twice', async () => {
    // A fresh claim is already held by another request.
    exams[0] = exam({ status: 'grading', gradingClaimedAt: new Date(), gradingRequestId: 'other' })

    const res = await POST(gradeReq())

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'This exam is already being graded' })
    expect(mocks.gradeAnswers).not.toHaveBeenCalled()
  })

  it('STEALS a claim older than the 5-minute TTL — a crashed grader cannot wedge an exam', async () => {
    exams[0] = exam({
      status: 'grading',
      gradingClaimedAt: new Date(Date.now() - 6 * 60_000),
      gradingRequestId: 'crashed',
    })

    const res = await POST(gradeReq())

    expect(res.status).toBe(200)
    expect(mocks.gradeAnswers).toHaveBeenCalledOnce()
    expect(exams[0]!.status).toBe('graded')
  })

  it('does NOT steal a claim that is still inside the TTL', async () => {
    exams[0] = exam({
      status: 'grading',
      gradingClaimedAt: new Date(Date.now() - 4 * 60_000),
      gradingRequestId: 'live',
    })

    expect((await POST(gradeReq())).status).toBe(409)
    expect(mocks.gradeAnswers).not.toHaveBeenCalled()
  })

  it('releases the claim when the AI call fails, so the exam stays retryable', async () => {
    mocks.gradeAnswers.mockResolvedValue({ ok: false, error: new Error('502 from provider') })

    const res = await POST(gradeReq())

    expect(res.status).toBe(502)
    // Back to `active` with the stamp cleared — NOT left wedged in `grading`.
    expect(exams[0]!.status).toBe('active')
    expect(exams[0]!.gradingClaimedAt).toBeNull()
    expect(exams[0]!.gradingRequestId).toBeNull()
    expect(currency[0]!.kp).toBe(0)
  })

  it('409s when a stale-recovered request took the claim DURING the paid call', async () => {
    // The interleave: our claim is stamped, we pay, and while we are waiting
    // another request steals the (now stale) claim. `mark.count === 0` is the
    // only thing that stops us writing a grade and a KP bonus we no longer own.
    mocks.gradeAnswers.mockImplementation(async () => {
      exams[0]!.gradingRequestId = 'someone_else'
      return verdict(90)
    })

    const res = await POST(gradeReq())

    expect(res.status).toBe(409)
    expect(attempts).toHaveLength(0)
    expect(currency[0]!.kp).toBe(0)
    expect(currency[0]!.clearanceLevel).toBe(0)
  })

  it('refuses an exam that is already graded, before claiming anything', async () => {
    exams[0] = exam({ status: 'graded', gradedAt: new Date() })

    expect((await POST(gradeReq())).status).toBe(409)
    expect(mocks.gradeAnswers).not.toHaveBeenCalled()
  })

  it('404s on another user’s exam — the claim is team- and user-scoped', async () => {
    exams[0] = exam({ userId: 'someone_else' })

    expect((await POST(gradeReq())).status).toBe(404)
    expect(mocks.gradeAnswers).not.toHaveBeenCalled()
  })
})

describe('the clearance raise and its KP bonus are ONE conditional write', () => {
  it('a first pass raises the level and pays the bonus exactly once', async () => {
    const body = await (await POST(gradeReq())).json()

    expect(body).toMatchObject({ passed: true, raised: true, newClearance: 1, kpEarned: LEVEL_1_BONUS })
    expect(currency[0]).toMatchObject({ clearanceLevel: 1, kp: LEVEL_1_BONUS })
    expect(activities).toHaveLength(1)
    expect(activities[0]!.action).toBe('clearance_raised')
  })

  it('the `lt` guard and the `kp` increment are in the SAME updateMany', async () => {
    await POST(gradeReq())

    expect(raiseCalls).toHaveLength(1)
    const [raise] = raiseCalls
    // Splitting these into two statements is the regression this pins: the
    // guard would still gate the LEVEL while the increment paid unconditionally.
    expect(raise!.where).toMatchObject({ teamId: 'team_1', clearanceLevel: { lt: 1 } })
    expect(raise!.data).toMatchObject({ clearanceLevel: 1, kp: { increment: LEVEL_1_BONUS } })
  })

  it('a team already at or above the target is not paid again', async () => {
    currency[0] = { teamId: 'team_1', clearanceLevel: 1, kp: 500 }

    const body = await (await POST(gradeReq())).json()

    expect(body).toMatchObject({ passed: true, raised: false, kpEarned: 0, newClearance: 1 })
    expect(currency[0]!.kp).toBe(500)
    expect(activities).toEqual([]) // no clearance_raised record either
  })

  it('two interleaved passing submissions pay the bonus ONCE — by predicate, not by isolation', async () => {
    // THE ATTACK. Two exams for the same target level, graded at the same
    // instant. Only the first `updateMany` can match `clearanceLevel < 1`; the
    // second matches nothing, and because the increment rides on that same
    // predicate it does not pay. Decouple them and this team is paid twice for
    // one level.
    //
    // What this does NOT prove, and the title no longer claims: DB atomicity.
    // `$transaction` here is `fn => fn(db)` — no isolation, no lock — so what is
    // exercised is the compare-and-set SHAPE against a row store that honours
    // `lt`, with the two calls interleaved by `Promise.all` rather than by the
    // database. Real interleavings are proven in `test/pg/invariants.pg.test.ts`,
    // and `expertise/grade` is still absent from it. It is OWED one: the raise
    // increments `kp` and `clearanceLevel` gates `minClearance` purchases
    // (`lib/economy.ts`), so this is the money path, not a cosmetic level. The
    // A6-style row is the open item — see REFACTOR2 §0.11 v0.75.10.
    exams.push(exam({ id: 'exam_2' }))

    await Promise.all([POST(gradeReq('exam_1')), POST(gradeReq('exam_2'))])

    expect(currency[0]!.clearanceLevel).toBe(1)
    expect(currency[0]!.kp).toBe(LEVEL_1_BONUS)
    expect(activities).toHaveLength(1)
  })

  it('a failing exam is recorded but raises nothing and pays nothing', async () => {
    mocks.gradeAnswers.mockResolvedValue(verdict(10))

    const body = await (await POST(gradeReq())).json()

    expect(body).toMatchObject({ passed: false, raised: false, kpEarned: 0, newClearance: 0 })
    expect(raiseCalls).toEqual([]) // the raise is not even attempted
    expect(currency[0]).toMatchObject({ clearanceLevel: 0, kp: 0 })
    expect(exams[0]!.status).toBe('graded')
    expect(attempts).toHaveLength(3) // the attempt history is still written
  })

  it('the score is the server aggregate over ALL questions, not the model’s own number', async () => {
    // Two questions graded 100, the third missing from the model's output
    // entirely. The canonical denominator is the question count, so the
    // aggregate must be 67 — a model that returns fewer rows must not
    // accidentally raise the average.
    mocks.gradeAnswers.mockResolvedValue({
      ok: true,
      graded: [
        { questionId: 'q1', score: 100, rationale: '' },
        { questionId: 'q2', score: 100, rationale: '' },
      ],
    })

    const body = await (await POST(gradeReq())).json()

    expect(body.score).toBe(67)
    expect(body.passed).toBe(false)
  })

  it('clamps a model score outside 0-100 before it reaches the aggregate', async () => {
    mocks.gradeAnswers.mockResolvedValue({
      ok: true,
      graded: QUESTIONS.map((q) => ({ questionId: q.id, score: 10_000, rationale: '' })),
    })

    const body = await (await POST(gradeReq())).json()

    expect(body.score).toBe(100)
    expect(body.kpEarned).toBe(LEVEL_1_BONUS) // still the flat level bonus
  })
})
