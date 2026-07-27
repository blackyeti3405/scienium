import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Paid phase advancement is claimed and compare-and-set (REFACTOR2 P1-R2).
 *
 * `literature_review → research_planning` reads the phase, runs a PAID Haiku
 * classification, then wrote with an unconditional `team.update({ id })`. Two
 * concurrent clicks both paid and both wrote, and a request whose model call
 * returned after another transition stamped `research_planning` over whatever
 * the team had moved on to — a later result rolling the lab BACKWARDS.
 *
 * The self-advance transitions in the same route already used a conditional
 * `updateMany`; these pin that the paid path now matches.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  enforceRateLimit: vi.fn((): Promise<unknown> => Promise.resolve(null)),
  teamUpdateMany: vi.fn(),
  teamFindUnique: vi.fn(),
  classifyLabType: vi.fn(),
  getLiteratureAdvanceProgress: vi.fn(),
  recordActivity: vi.fn(() => Promise.resolve()),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: mocks.enforceRateLimit }))
vi.mock('@/lib/lab-type/classify', () => ({ classifyLabType: mocks.classifyLabType }))
vi.mock('@/lib/activity/log', () => ({ recordActivity: mocks.recordActivity }))
vi.mock('@/lib/team/advance', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/team/advance')>()),
  getLiteratureAdvanceProgress: mocks.getLiteratureAdvanceProgress,
}))
vi.mock('@/lib/db', () => {
  const db = {
    team: { updateMany: mocks.teamUpdateMany, findUnique: mocks.teamFindUnique },
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(db)),
  }
  return { db }
})

import { POST } from '@/app/api/team/advance-phase/route'

function advanceReq(researchIdea = 'Testing how ankle prosthesis stiffness affects gait symmetry.') {
  return new NextRequest('http://app.example.com/api/team/advance-phase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ researchIdea }),
  })
}

/** The claim is the first updateMany; the transition is the second. */
const claimCall = () => mocks.teamUpdateMany.mock.calls[0]![0]
const casCall = () => mocks.teamUpdateMany.mock.calls[1]![0]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1', phase: 'literature_review' },
    error: null,
  })
  mocks.enforceRateLimit.mockResolvedValue(null)
  mocks.getLiteratureAdvanceProgress.mockResolvedValue({ canAdvance: true })
  mocks.classifyLabType.mockResolvedValue({ labType: 'volt_lab', rationale: 'electronics' })
  mocks.teamUpdateMany.mockResolvedValue({ count: 1 })
  mocks.teamFindUnique.mockResolvedValue({ phase: 'working', labType: 'volt_lab' })
})

describe('the paid advance is claimed before it spends', () => {
  it('claims, then classifies, then transitions', async () => {
    const res = await POST(advanceReq())

    expect(res.status).toBe(200)
    expect(claimCall().data).toMatchObject({ advanceClaimedAt: expect.any(Date) })
    expect(mocks.teamUpdateMany.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.classifyLabType.mock.invocationCallOrder[0]!,
    )
  })

  // The whole point: a second click must not reach Anthropic.
  it('409s the loser without paying', async () => {
    mocks.teamUpdateMany.mockResolvedValue({ count: 0 })

    const res = await POST(advanceReq())

    expect(res.status).toBe(409)
    expect(mocks.classifyLabType).not.toHaveBeenCalled()
  })

  it('predicates the claim on the phase AND a free-or-stale slot', async () => {
    await POST(advanceReq())

    expect(claimCall().where).toMatchObject({ id: 'team_1', phase: 'literature_review' })
    expect(claimCall().where.OR).toEqual([
      { advanceClaimedAt: null },
      { advanceClaimedAt: { lt: expect.any(Date) } },
    ])
  })

  it('releases the claim when classification throws, rather than wedging the team', async () => {
    mocks.classifyLabType.mockRejectedValue(new Error('anthropic down'))

    await expect(POST(advanceReq())).rejects.toThrow('anthropic down')

    expect(mocks.teamUpdateMany.mock.calls.at(-1)![0].data).toMatchObject({ advanceClaimedAt: null })
  })

  it('still refuses to spend when the readiness gate fails', async () => {
    mocks.getLiteratureAdvanceProgress.mockResolvedValue({ canAdvance: false, sources: 3 })

    const res = await POST(advanceReq())

    expect(res.status).toBe(409)
    expect(mocks.teamUpdateMany).not.toHaveBeenCalled()
    expect(mocks.classifyLabType).not.toHaveBeenCalled()
  })

  it('clears the paid tier before claiming or classifying', async () => {
    mocks.enforceRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ error: 'limited' }), { status: 429 }),
    )

    const res = await POST(advanceReq())

    expect(res.status).toBe(429)
    expect(mocks.teamUpdateMany).not.toHaveBeenCalled()
    expect(mocks.classifyLabType).not.toHaveBeenCalled()
  })
})

describe('a late result can never roll the lab backwards', () => {
  it('writes the transition under a phase predicate', async () => {
    await POST(advanceReq())

    expect(casCall()).toMatchObject({
      where: { id: 'team_1', phase: 'literature_review' },
      data: expect.objectContaining({ phase: 'research_planning', advanceClaimedAt: null }),
    })
  })

  // The headline defect: the team moved on while we were classifying.
  it('does not overwrite a team that already advanced past research_planning', async () => {
    mocks.teamUpdateMany
      .mockResolvedValueOnce({ count: 1 }) // claim won
      .mockResolvedValueOnce({ count: 0 }) // CAS matched nothing — phase moved
      .mockResolvedValue({ count: 1 }) // claim release
    mocks.teamFindUnique.mockResolvedValue({ phase: 'showcase', labType: 'volt_lab' })

    const res = await POST(advanceReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ phase: 'showcase', alreadyAdvanced: true })
    // And it did NOT claim to have advanced the team itself.
    expect(mocks.recordActivity).not.toHaveBeenCalled()
  })

  it('logs the advance only when the transition actually committed', async () => {
    await POST(advanceReq())

    expect(mocks.recordActivity).toHaveBeenCalledWith(
      expect.anything(),
      'team_1',
      'user_1',
      'phase_advanced',
      expect.objectContaining({ fromPhase: 'literature_review', toPhase: 'research_planning' }),
    )
  })
})

describe('the free self-advance path is unchanged', () => {
  it('bumps research_planning → working conditionally, with no paid call', async () => {
    mocks.requireTeamContext.mockResolvedValue({
      ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1', phase: 'research_planning' },
      error: null,
    })

    const res = await POST(advanceReq())

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ phase: 'working' })
    expect(mocks.teamUpdateMany).toHaveBeenCalledWith({
      where: { id: 'team_1', phase: 'research_planning' },
      data: { phase: 'working' },
    })
    expect(mocks.classifyLabType).not.toHaveBeenCalled()
    expect(mocks.enforceRateLimit).not.toHaveBeenCalledWith(expect.anything(), 'ai', expect.anything())
  })
})
