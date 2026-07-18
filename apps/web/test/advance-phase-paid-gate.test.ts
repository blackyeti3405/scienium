import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Paid-gate ordering for phase advance (PILOT-2): the literature_review →
 * research_planning transition runs an Anthropic classification, so the paid
 * `ai` tier must be cleared BEFORE `classifyLabType` fires. A denied paid tier
 * means no model call and no phase change.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  enforceRateLimit: vi.fn(),
  classifyLabType: vi.fn(),
  getLiteratureAdvanceProgress: vi.fn(),
  isSelfAdvance: vi.fn(),
  logActivity: vi.fn(() => Promise.resolve()),
  teamUpdate: vi.fn(() => Promise.resolve({})),
  teamUpdateMany: vi.fn(() => Promise.resolve({ count: 1 })),
}))

vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: mocks.enforceRateLimit }))
vi.mock('@/lib/lab-type/classify', () => ({ classifyLabType: mocks.classifyLabType }))
vi.mock('@/lib/team/advance', () => ({
  getLiteratureAdvanceProgress: mocks.getLiteratureAdvanceProgress,
  isSelfAdvance: mocks.isSelfAdvance,
  SELF_ADVANCE_TRANSITIONS: { research_planning: 'working', working: 'showcase' },
}))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('@/lib/db', () => ({
  db: { team: { update: mocks.teamUpdate, updateMany: mocks.teamUpdateMany } },
}))

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
  mocks.isSelfAdvance.mockReturnValue(false)
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
    expect(mocks.teamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CTX.teamId },
        data: expect.objectContaining({ phase: 'research_planning', labType: 'volt_lab' }),
      }),
    )
  })

  it('self-paced transitions never touch the paid tier or the model', async () => {
    mocks.requireTeamContext.mockResolvedValue({
      ctx: { ...CTX, phase: 'research_planning' },
      error: null,
    })
    mocks.isSelfAdvance.mockReturnValue(true)

    const res = await POST(advanceReq({}))

    expect(res.status).toBe(200)
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled()
    expect(mocks.classifyLabType).not.toHaveBeenCalled()
  })
})
