import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R13 — "Check my synthesis" could grade cells the student could
 * not see.
 *
 * Cells save asynchronously on blur. The click that starts a check blurs the
 * textarea and fired the check in the same gesture, with no flush barrier and
 * nothing telling the server which grid was meant — so the paid call could read
 * the PREVIOUS database value, cache a verdict for it, and mint KP for it.
 *
 * These tests pin the ATTACK, not the shape. Each one interleaves a grid that
 * has moved and asserts that nothing was paid for, cached, or minted against a
 * snapshot the student never submitted.
 */

const mocks = vi.hoisted(() => ({
  matrixFindFirst: vi.fn(),
  paperFindMany: vi.fn(),
  cellFindMany: vi.fn(),
  txMatrixFindUnique: vi.fn(),
  txCellFindMany: vi.fn(),
  txMatrixUpdate: vi.fn(),
  queryRaw: vi.fn(),
  currencyUpsert: vi.fn(),
  runAiOperation: vi.fn(),
  aiCreate: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn(), requestIdFrom: () => 'r' }))
vi.mock('@/lib/activity/log', () => ({ logActivityBestEffort: async () => {} }))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: async () => {} }))
vi.mock('@/lib/ai/spend', () => ({ aiCreate: mocks.aiCreate }))
vi.mock('@/lib/ai/operation', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  runAiOperation: mocks.runAiOperation,
}))
vi.mock('@/lib/api/route-context', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  requireTeamContext: async () => ({
    ctx: { userId: 'clerk_1', dbUserId: 'u1', teamId: 'team_1', phase: 'literature_review', labType: null },
    error: null,
  }),
}))
vi.mock('@/lib/db', () => ({
  db: {
    synthesisMatrix: { findFirst: mocks.matrixFindFirst },
    paper: { findMany: mocks.paperFindMany },
    synthesisCell: { findMany: mocks.cellFindMany },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        synthesisMatrix: { findUnique: mocks.txMatrixFindUnique, update: mocks.txMatrixUpdate },
        synthesisCell: { findMany: mocks.txCellFindMany },
        teamCurrency: { upsert: mocks.currencyUpsert },
        $queryRaw: mocks.queryRaw,
      }),
  },
}))

import { POST } from '@/app/api/literature/synthesis/[id]/check/route'
import { matrixInputHash, SYNTHESIS_KP_AWARD } from '@/lib/literature/synthesis'

const COLUMNS = [{ id: 'finding', label: 'Key finding' }]
const PAPER_IDS = ['p1', 'p2']

/** The matrix row as Prisma would return it. */
function matrixRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    teamId: 'team_1',
    templateId: 'general',
    columnsJson: COLUMNS,
    paperIds: PAPER_IDS,
    kpAwarded: 0,
    lastCheckJson: null,
    lastCheckedAt: null,
    ...overrides,
  }
}

const cell = (paperId: string, text: string) => ({ paperId, columnId: 'finding', text })

function hashOf(cells: { paperId: string; columnId: string; text: string }[]) {
  return matrixInputHash('general', COLUMNS, PAPER_IDS, cells)
}

async function post(body: unknown) {
  const req = new Request('http://localhost/api/literature/synthesis/m1/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // The route reads `req.json()` and Next's params promise; a plain Request is
  // enough for both.
  return POST(req as never, { params: Promise.resolve({ id: 'm1' }) })
}

/** The grid as the student sees it — what they intend to have graded. */
const SEEN = [cell('p1', 'Warming raised growth 12%.'), cell('p2', 'Warming lowered growth 4%.')]
/** The grid the database still holds because the last blur-save has not landed. */
const STALE = [cell('p1', 'Warming raised growth 12%.'), cell('p2', '')]

const VERDICT = {
  agreements: [],
  contradictions: [],
  gaps: [],
  cellIssues: [],
  suggestedColumns: [],
  summary: 'You read both sources carefully.',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.paperFindMany.mockResolvedValue([
    { id: 'p1', title: 'A', authors: ['X'], abstract: 'a', fullText: null },
    { id: 'p2', title: 'B', authors: ['Y'], abstract: 'b', fullText: null },
  ])
  mocks.runAiOperation.mockImplementation(async (input: { run: () => Promise<unknown> }) => {
    await input.run()
    return { ok: true, result: VERDICT, replayed: false }
  })
  mocks.aiCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(VERDICT) }] })
  mocks.queryRaw.mockResolvedValue([{ kp_awarded: SYNTHESIS_KP_AWARD }])
  mocks.currencyUpsert.mockResolvedValue({})
  mocks.txMatrixUpdate.mockResolvedValue({})
})

describe('the stale-grid gate', () => {
  it('refuses to grade a grid the student never submitted — before any spend', async () => {
    // THE ATTACK: the student's last cell save is still in flight, so the DB
    // holds STALE while the screen shows SEEN. The old code graded STALE.
    mocks.matrixFindFirst.mockResolvedValue(matrixRow())
    mocks.cellFindMany.mockResolvedValue(STALE)

    const res = await post({ expectedHash: hashOf(SEEN) })

    expect(res.status).toBe(409)
    expect(mocks.runAiOperation).not.toHaveBeenCalled()
    expect(mocks.aiCreate).not.toHaveBeenCalled()
    expect(mocks.txMatrixUpdate).not.toHaveBeenCalled()
    expect(mocks.currencyUpsert).not.toHaveBeenCalled()
  })

  it('grades — and pays — only when the server holds exactly what was submitted', async () => {
    mocks.matrixFindFirst.mockResolvedValue(matrixRow())
    mocks.cellFindMany.mockResolvedValue(SEEN)
    mocks.txMatrixFindUnique.mockResolvedValue(matrixRow())
    mocks.txCellFindMany.mockResolvedValue(SEEN)

    const res = await post({ expectedHash: hashOf(SEEN) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.stale).toBe(false)
    expect(body.kpEarned).toBe(SYNTHESIS_KP_AWARD)
    expect(mocks.txMatrixUpdate).toHaveBeenCalledOnce()
  })

  it('requires the hash — an omitted one is not an unbound check', async () => {
    mocks.matrixFindFirst.mockResolvedValue(matrixRow())

    const res = await post({})

    expect(res.status).toBe(400)
    expect(mocks.runAiOperation).not.toHaveBeenCalled()
  })
})

describe('a grid that moves during the paid call', () => {
  it('returns the verdict but stores nothing and mints no KP', async () => {
    // THE INTERLEAVE: the gate passed, the call was paid for — and a teammate
    // edited the grid while Vega was reading. The verdict is true of what was
    // submitted, so it is returned; it must not become the matrix's standing
    // check, and it must not mint KP for a grid nobody can see.
    mocks.matrixFindFirst.mockResolvedValue(matrixRow())
    mocks.cellFindMany.mockResolvedValue(SEEN)
    mocks.txMatrixFindUnique.mockResolvedValue(matrixRow())
    mocks.txCellFindMany.mockResolvedValue([cell('p1', 'Teammate rewrote this.'), cell('p2', 'And this.')])

    const res = await post({ expectedHash: hashOf(SEEN) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.stale).toBe(true)
    expect(body.kpEarned).toBe(0)
    expect(mocks.txMatrixUpdate).not.toHaveBeenCalled()
    expect(mocks.queryRaw).not.toHaveBeenCalled()
    expect(mocks.currencyUpsert).not.toHaveBeenCalled()
  })

  it('catches a column change too, not just cell text', async () => {
    mocks.matrixFindFirst.mockResolvedValue(matrixRow())
    mocks.cellFindMany.mockResolvedValue(SEEN)
    // Same cells; a teammate added a column mid-call. The grid Vega graded no
    // longer describes the matrix, so nothing is stored.
    mocks.txMatrixFindUnique.mockResolvedValue(
      matrixRow({ columnsJson: [...COLUMNS, { id: 'method', label: 'Method' }] }),
    )
    mocks.txCellFindMany.mockResolvedValue(SEEN)

    const body = await (await post({ expectedHash: hashOf(SEEN) })).json()

    expect(body.stale).toBe(true)
    expect(mocks.txMatrixUpdate).not.toHaveBeenCalled()
  })
})

describe('concurrency and replay', () => {
  it('a second concurrent check of the same snapshot does not pay again', async () => {
    mocks.matrixFindFirst.mockResolvedValue(matrixRow())
    mocks.cellFindMany.mockResolvedValue(SEEN)
    mocks.runAiOperation.mockResolvedValue({ ok: false, reason: 'in_flight' })

    const res = await post({ expectedHash: hashOf(SEEN) })

    expect(res.status).toBe(409)
    expect(mocks.aiCreate).not.toHaveBeenCalled()
    expect(mocks.currencyUpsert).not.toHaveBeenCalled()
  })

  it('replays the stored verdict for a byte-identical grid without calling out', async () => {
    const inputHash = hashOf(SEEN)
    mocks.matrixFindFirst.mockResolvedValue(matrixRow({ lastCheckJson: { inputHash, verdict: VERDICT } }))
    mocks.cellFindMany.mockResolvedValue(SEEN)

    const body = await (await post({ expectedHash: inputHash })).json()

    expect(body.cached).toBe(true)
    expect(body.kpEarned).toBe(0)
    expect(mocks.runAiOperation).not.toHaveBeenCalled()
  })
})
