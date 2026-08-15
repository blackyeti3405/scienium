import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  team: vi.fn(),
  plan: vi.fn(),
  papers: vi.fn(),
  logs: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    team: { findUnique: mocks.team },
    researchPlan: { findUnique: mocks.plan },
    paper: { findMany: mocks.papers },
    projectLog: { findMany: mocks.logs },
  },
}))

import { getProjectContext, hasMinimumContext, renderProjectContext } from './context'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.team.mockResolvedValue(null)
  mocks.plan.mockResolvedValue(null)
  mocks.papers.mockResolvedValue([])
  mocks.logs.mockResolvedValue([])
})

describe('getProjectContext', () => {
  it('team-scopes and bounds every source before it reaches an exam prompt', async () => {
    mocks.team.mockResolvedValue({
      topic: 'Cells',
      researchIdea: 'Compare growth rates',
      labType: 'biocore',
    })
    mocks.plan.mockResolvedValue({ lastSyncedText: 'p'.repeat(17_000), projectType: 'science' })
    mocks.papers.mockResolvedValue([{ title: 'Paper A' }, { title: 'Paper B' }])
    mocks.logs.mockResolvedValue([
      { stage: 'Testing', body: `**Result**   ${'x'.repeat(400)}` },
      { stage: null, body: ' ## `[]()`' },
    ])

    const context = await getProjectContext('team_1')

    expect(mocks.team).toHaveBeenCalledWith({
      where: { id: 'team_1' },
      select: { topic: true, researchIdea: true, labType: true },
    })
    expect(mocks.plan).toHaveBeenCalledWith({
      where: { teamId: 'team_1' },
      select: { lastSyncedText: true, projectType: true },
    })
    expect(mocks.papers).toHaveBeenCalledWith({
      where: { teamId: 'team_1', status: 'ready' },
      orderBy: { createdAt: 'asc' },
      take: 25,
      select: { title: true },
    })
    expect(mocks.logs).toHaveBeenCalledWith({
      where: { teamId: 'team_1' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { body: true, stage: true },
    })
    expect(context.planText).toHaveLength(16_000)
    expect(context.paperTitles).toEqual(['Paper A', 'Paper B'])
    expect(context.logSnippets).toHaveLength(1)
    expect(context.logSnippets[0]?.startsWith('[Testing] Result ')).toBe(true)
    expect(context.logSnippets[0]).toHaveLength(280)
  })

  it('returns an honest empty snapshot when the team has no project data yet', async () => {
    await expect(getProjectContext('team_1')).resolves.toEqual({
      topic: null,
      researchIdea: null,
      labType: null,
      projectType: null,
      planText: null,
      paperTitles: [],
      logSnippets: [],
    })
  })
})

describe('context readiness and rendering', () => {
  const empty = {
    topic: null,
    researchIdea: null,
    labType: null,
    projectType: null,
    planText: null,
    paperTitles: [],
    logSnippets: [],
  }

  it('requires at least one meaningful project signal', () => {
    expect(hasMinimumContext(empty)).toBe(false)
    expect(hasMinimumContext({ ...empty, topic: 'Cells' })).toBe(true)
    expect(hasMinimumContext({ ...empty, researchIdea: 'Compare cells' })).toBe(true)
    expect(hasMinimumContext({ ...empty, planText: 'Plan' })).toBe(true)
    expect(hasMinimumContext({ ...empty, paperTitles: ['Paper'] })).toBe(true)
  })

  it('renders every available section with the human lab label', () => {
    const rendered = renderProjectContext({
      topic: 'Cells',
      researchIdea: 'Compare growth',
      labType: 'biocore',
      projectType: 'science',
      planText: 'The plan',
      paperTitles: ['Paper A'],
      logSnippets: ['[Testing] Result'],
    })

    expect(rendered).toContain('Research topic: Cells')
    expect(rendered).toContain('One-line research idea: Compare growth')
    expect(rendered).toContain('Lab specialty: BioCore')
    expect(rendered).toContain('Project type: science')
    expect(rendered).toContain('Sources reviewed (titles):\n- Paper A')
    expect(rendered).toContain('Recent project-log notes:\n- [Testing] Result')
    expect(rendered).toContain('Research plan (synced text):\n---\nThe plan')
  })

  it('labels a missing topic without inventing optional sections', () => {
    expect(renderProjectContext(empty)).toBe('Research topic: (not yet set)')
  })
})
