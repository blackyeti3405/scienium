import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('@/lib/db', () => ({ db: { activityFeed: { create: mocks.create } } }))

import { describeActivity, logActivityBestEffort } from './log'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('logActivityBestEffort', () => {
  it('writes the complete ambient event shape', async () => {
    mocks.create.mockResolvedValue({})

    await expect(
      logActivityBestEffort('team_1', 'user_1', 'paper_upload', { title: 'Paper' }),
    ).resolves.toBeUndefined()
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        teamId: 'team_1',
        userId: 'user_1',
        actionType: 'paper_upload',
        payloadJson: { title: 'Paper' },
      },
    })
  })

  it('never lets ambient feed failure break the gameplay path', async () => {
    mocks.create.mockRejectedValue(new Error('database unavailable'))

    await expect(
      logActivityBestEffort('team_1', 'user_1', 'paper_upload', {}),
    ).resolves.toBeUndefined()
  })
})

describe('describeActivity', () => {
  it.each([
    ['paper_upload', { title: 'Alpha' }, 'uploaded "Alpha"'],
    ['paper_delete', { title: 'Alpha' }, 'deleted "Alpha"'],
    ['quiz_passed', { paperTitle: 'Alpha', score: 91 }, 'passed quiz on "Alpha" (91%)'],
    ['topic_changed', { newTopic: 'Solar cells' }, 'changed topic to "Solar cells"'],
    ['topic_changed', {}, 'cleared the research topic'],
    ['discovery_node_added', { title: 'Photosynthesis' }, 'explored "Photosynthesis"'],
    ['discovery_kp_awarded', { kp: 20 }, 'earned 20 KP exploring sources'],
    ['topic_locked', { kp: 100 }, 'locked in their research topic (+100 KP)'],
    ['source_promoted', { title: 'Alpha' }, 'promoted "Alpha" into the literature review'],
    [
      'phase_advanced',
      { toPhase: 'Literature', labType: 'BioCore' },
      'advanced the lab to Literature · assigned BioCore',
    ],
    ['member_joined', {}, 'joined the lab'],
    ['member_left', {}, 'left the lab'],
    ['plan_synced', {}, 'synced the research plan'],
    ['plan_reviewed', {}, 'ran AI review of the research plan'],
    ['idea_checked', { verdict: 'novel' }, 'ran originality check (novel)'],
    ['clearance_raised', { level: 2, title: 'Analyst' }, 'reached Clearance Level 2 — Analyst'],
    ['showcase_published', { title: 'Our Project' }, 'published the project showcase "Our Project"'],
    ['building_purchased', { buildingName: 'Microscope' }, 'purchased Microscope'],
    ['building_sold', { buildingName: 'Microscope', refund: 50 }, 'sold Microscope for 50 KP'],
    ['building_upgraded', { buildingName: 'Microscope', level: 3 }, 'upgraded Microscope to level 3'],
    ['log_created', { kind: 'failure' }, 'added a failure log entry'],
    ['log_edited', { kind: 'project' }, 'edited a project log entry'],
    ['log_deleted', { kind: 'failure' }, 'deleted a failure log entry'],
    ['codex_lesson_completed', { trackSlug: 'biology' }, 'completed a Field Codex lesson (biology)'],
    ['explanation_passed', { paperTitle: 'Alpha', score: 88 }, 'explained "Alpha" back to Vega (88%)'],
    ['synthesis_checked', { missed: 2 }, 'ran a synthesis check (2 missed)'],
    ['vocab_term_mastered', { term: 'allele' }, 'mastered the term "allele"'],
    ['future_action', {}, 'future action'],
  ] as const)('%s', (action, payload, expected) => {
    expect(describeActivity(action, payload)).toBe(expected)
  })
})
