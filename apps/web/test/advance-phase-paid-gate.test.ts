import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Paid-gate ordering for phase advance (PILOT-2): the literature_review →
 * working transition runs an Anthropic classification, so the paid
 * `ai` tier must be cleared BEFORE `classifyLabType` fires. A denied paid tier
 * means no model call and no phase change.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  enforceRateLimit: vi.fn(),
  classifyLabType: vi.fn(),
  getLiteratureAdvanceProgress: vi.fn(),
  isTeacherPaced: vi.fn(),
  recordActivity: vi.fn(() => Promise.resolve()),
  teamUpdate: vi.fn(() => Promise.resolve({})),
  teamUpdateMany: vi.fn(() => Promise.resolve({ count: 1 })),
}))

vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: mocks.enforceRateLimit }))
vi.mock('@/lib/lab-type/classify', () => ({ classifyLabType: mocks.classifyLabType }))
vi.mock('@/lib/team/advance', () => ({
  getLiteratureAdvanceProgress: mocks.getLiteratureAdvanceProgress,
}))
// Self-paced by default; a classroom lab is covered by its own case below.
vi.mock('@/lib/team/class-scope', () => ({ isTeacherPaced: mocks.isTeacherPaced }))
vi.mock('@/lib/activity/log', () => ({ recordActivity: mocks.recordActivity }))
vi.mock('@/lib/db', () => {
  const db = {
    team: { update: mocks.teamUpdate, updateMany: mocks.teamUpdateMany },
    // Lab-type reassignment carries the plot with it (lib/lab-type/transfer.ts),
    // inside this transaction. Empty plot — the remap has its own test.
    teamShopBuilding: { findMany: vi.fn(async () => []), update: vi.fn() },
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(db)),
  }
  return { db }
})

import { POST } from '@/app/api/team/advance-phase/route'

function advanceReq(body: unknown): NextRequest {
  return new NextRequest('http://app.example.com/api/team/advance-phase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const CTX = {
  userId: 'clerk_user_1',
  dbUserId: 'db_user_1',
  teamId: 'team_1',
  phase: 'literature_review',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({ ctx: CTX, error: null })
  mocks.isTeacherPaced.mockResolvedValue(false)
  mocks.getLiteratureAdvanceProgress.mockResolvedValue({ canAdvance: true })
})

describe('advance-phase paid gate', () => {
  it('a denied ai tier blocks the transition before any model call', async () => {
    mocks.enforceRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'limited' }, { status: 429 }),
    )

    const res = await POST(advanceReq({ researchIdea: 'How light color affects basil growth.' }))

    expect(res.status).toBe(429)
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(expect.anything(), 'ai', CTX.userId)
    expect(mocks.classifyLabType).not.toHaveBeenCalled()
    expect(mocks.teamUpdate).not.toHaveBeenCalled()
  })

  it('a cleared ai tier classifies and advances the phase', async () => {
    mocks.enforceRateLimit.mockResolvedValue(null)
    mocks.classifyLabType.mockResolvedValue({ labType: 'volt_lab', rationale: 'electronics' })

    const res = await POST(advanceReq({ researchIdea: 'How light color affects basil growth.' }))

    expect(res.status).toBe(200)
    expect(mocks.classifyLabType).toHaveBeenCalledOnce()
    // The transition is a COMPARE-AND-SET on the phase, not an unconditional
    // `team.update({ id })` (REFACTOR2 P1-R2) — a paid call takes seconds, and
    // an unconditional write could stamp `working` over a phase the
    // team had already moved past. `teamUpdate` is no longer used at all here.
    expect(mocks.teamUpdate).not.toHaveBeenCalled()
    expect(mocks.teamUpdateMany).toHaveBeenCalledWith({
      where: { id: CTX.teamId, phase: 'literature_review' },
      data: expect.objectContaining({ phase: 'working', labType: 'volt_lab' }),
    })
  })

  it('a classroom lab is refused before the paid tier or the model', async () => {
    // Its teacher runs the unit — the lab does not spend a paid call to advance
    // itself, and must not move even if the literature gate is satisfied.
    mocks.isTeacherPaced.mockResolvedValue(true)

    const res = await POST(advanceReq({ researchIdea: 'How light color affects basil growth.' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ teacherPaced: true })
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled()
    expect(mocks.classifyLabType).not.toHaveBeenCalled()
    expect(mocks.teamUpdateMany).not.toHaveBeenCalled()
  })
})
