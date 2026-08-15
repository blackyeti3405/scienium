import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  aiCreate: vi.fn(),
  logEvent: vi.fn(),
  loadTrack: vi.fn(),
  labTypeFields: vi.fn(),
}))

vi.mock('@/lib/ai/spend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai/spend')>()),
  aiCreate: mocks.aiCreate,
}))
vi.mock('@/lib/observability/log', () => ({ logEvent: mocks.logEvent }))
vi.mock('./index', () => ({
  CODEX_TRACKS: [
    { slug: 'gait-biomechanics', label: 'Gait', branchCount: 1, lessonCount: 10 },
    { slug: 'ecology', label: 'Ecology', branchCount: 0, lessonCount: 10 },
  ],
  loadTrack: mocks.loadTrack,
  labTypeFields: mocks.labTypeFields,
}))

import { recommendTracks } from './study-plan'

const reply = (value: unknown, stopReason = 'end_turn') =>
  ({
    content: [{ type: 'text', text: JSON.stringify(value) }],
    stop_reason: stopReason,
  }) as never

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.E2E_SKIP_LLM
  mocks.labTypeFields.mockReturnValue(['ecology'])
  mocks.loadTrack.mockResolvedValue({ branches: [{ id: 'gait-branch' }] })
})

afterEach(() => {
  delete process.env.E2E_SKIP_LLM
})

describe('recommendTracks', () => {
  it('uses a real deterministic track and branch in E2E mode without spending', async () => {
    process.env.E2E_SKIP_LLM = '1'

    const result = await recommendTracks({
      topic: 'Gait',
      researchIdea: null,
      planText: null,
      labType: 'biocore',
    })
    expect(result).toEqual([
      expect.objectContaining({
        trackSlug: 'gait-biomechanics',
        branchSlugs: ['prosthetics-orthotics-gait'],
      }),
    ])
    expect(mocks.aiCreate).not.toHaveBeenCalled()
  })

  it('spends nothing on blank project context and prefers the lab-type fallback', async () => {
    const result = await recommendTracks({
      topic: '   ',
      researchIdea: null,
      planText: '',
      labType: 'biocore',
    })

    expect(result[0]).toMatchObject({ trackSlug: 'ecology', branchSlugs: [] })
    expect(mocks.aiCreate).not.toHaveBeenCalled()
    expect(mocks.loadTrack).not.toHaveBeenCalled()
  })

  it('falls back safely when the provider throws', async () => {
    mocks.aiCreate.mockRejectedValue(new Error('provider unavailable'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await recommendTracks({
      topic: 'Ecology',
      researchIdea: null,
      planText: null,
      labType: 'biocore',
    })
    expect(result[0]?.trackSlug).toBe('ecology')
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('allowlists tracks, keeps branches with their own track, and caps the result', async () => {
    mocks.aiCreate.mockResolvedValue(
      reply([
        { trackSlug: 'invented', branchSlugs: [], rationale: 'No' },
        {
          trackSlug: 'gait-biomechanics',
          branchSlugs: ['gait-branch', 'ecology-branch'],
          rationale: 'Fits movement.',
        },
        { trackSlug: 'ecology', branchSlugs: ['gait-branch'], rationale: 'Fits habitat.' },
      ]),
    )

    await expect(
      recommendTracks({ topic: 'Movement in habitats', researchIdea: null, planText: null, labType: null }),
    ).resolves.toEqual([
      {
        trackSlug: 'gait-biomechanics',
        branchSlugs: ['gait-branch'],
        rationale: 'Fits movement.',
      },
      { trackSlug: 'ecology', branchSlugs: [], rationale: 'Fits habitat.' },
    ])
  })

  it('rejects malformed output, logs no project text, and returns a safe default', async () => {
    mocks.aiCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[{"trackSlug":"SECRET"}' }],
      stop_reason: 'max_tokens',
    })

    const result = await recommendTracks({
      topic: 'SECRET PROJECT',
      researchIdea: null,
      planText: null,
      labType: null,
    })
    expect(result[0]?.trackSlug).toBe('gait-biomechanics')
    expect(mocks.logEvent).toHaveBeenCalledWith({
      event: 'codex.study_plan_parse_failed',
      outcome: 'error',
      detail: expect.stringContaining('reason=truncated'),
    })
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain('SECRET')
  })

  it('bounds untrusted context and makes exactly one classified request', async () => {
    mocks.aiCreate.mockResolvedValue(
      reply([{ trackSlug: 'ecology', branchSlugs: [], rationale: 'Fits.' }]),
    )

    await recommendTracks({
      topic: 't'.repeat(700),
      researchIdea: 'i'.repeat(1200),
      planText: 'p'.repeat(4500),
      labType: null,
    })

    expect(mocks.aiCreate).toHaveBeenCalledOnce()
    const [operation, request] = mocks.aiCreate.mock.calls[0]
    expect(operation).toBe('study_plan_tracks')
    const content = request.messages[0].content as string
    expect(content).toContain(`<project_context>\ntopic: ${'t'.repeat(500)}`)
    expect(content).not.toContain('t'.repeat(501))
    expect(content).toContain(`research idea: ${'i'.repeat(1000)}`)
    expect(content).toContain(`plan excerpt: ${'p'.repeat(4000)}`)
    expect(content).toContain('</project_context>')
  })
})
