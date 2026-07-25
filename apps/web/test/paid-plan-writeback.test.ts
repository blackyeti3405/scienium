import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-S9 — paid writebacks are versionless.
 *
 * All three plan-driven paid workflows read a source, called out for tens of
 * seconds, and then wrote back unconditionally. Two failures follow from that:
 * slow old work overwrites newer truth, and concurrent callers both pay.
 *
 * These tests pin the ATTACK, not the shape. The interleaving each one models
 * is: the team edits the plan (or a second generation finishes) WHILE the paid
 * call is in flight, and the late result must write nothing.
 */

const mocks = vi.hoisted(() => ({
  // study plan
  teamFindUnique: vi.fn(),
  planFindUnique: vi.fn(),
  studyPlanFindUnique: vi.fn(),
  studyPlanUpdateMany: vi.fn(),
  queryRaw: vi.fn(),
  recommendTracks: vi.fn(),
  runAiOperation: vi.fn(),
  // research plan (claim + writeback)
  planUpdateMany: vi.fn(),
  ideaCheckCreate: vi.fn(),
  ideaCheckCount: vi.fn(),
  stream: vi.fn(),
  loadRubric: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    team: { findUnique: mocks.teamFindUnique },
    researchPlan: { findUnique: mocks.planFindUnique, updateMany: mocks.planUpdateMany },
    teamStudyPlan: { findUnique: mocks.studyPlanFindUnique, updateMany: mocks.studyPlanUpdateMany },
    ideaCheck: { create: mocks.ideaCheckCreate, count: mocks.ideaCheckCount },
    $queryRaw: mocks.queryRaw,
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        ideaCheck: { create: mocks.ideaCheckCreate },
        researchPlan: { updateMany: mocks.planUpdateMany },
      }),
  },
}))
vi.mock('@/lib/ops/codex/study-plan', () => ({ recommendTracks: mocks.recommendTracks }))
vi.mock('@/lib/ai/operation', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  runAiOperation: mocks.runAiOperation,
}))
vi.mock('@/lib/anthropic', () => ({ anthropic: () => ({ messages: { stream: mocks.stream } }) }))
vi.mock('@/lib/research-plan/rubric', () => ({ loadResearchRubric: mocks.loadRubric }))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))

import { generateStudyPlan } from '@/lib/ops/codex/study-plan-service'
import { reviewPlan } from '@/lib/research-plan/review-service'
import { runIdeaCheck } from '@/lib/research-plan/idea-check-service'
import { readNdjson } from '@/lib/ndjson'

const TEAM = 'team_1'
const PLAN_TEXT = 'Our plan: measure basil growth under three light spectra.'

/** Drain an NDJSON ReadableStream into an array of parsed events. */
async function drain(stream: ReadableStream): Promise<any[]> {
  const events: any[] = []
  await readNdjson(stream as ReadableStream<Uint8Array>, (e) => events.push(e))
  return events
}

/** A fake Anthropic streaming handle emitting one text block, then finishing. */
function fakeStream(text: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
    },
    finalMessage: async () => ({ content: [], stop_reason: 'end_turn' }),
  }
}

const VERDICT_JSON =
  '{"verdict":"novel","summary":"No close prior art.","priorWork":[],"differentiation":"x","recommendation":"y"}'

const REVIEW_LINES =
  '{"kind":"overall","readiness":"promising","score":70,"summary":"Solid."}\n' +
  '{"kind":"section","title":"I. Question","score":8,"max":10,"assessment":"Clear."}\n'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.teamFindUnique.mockResolvedValue({ topic: 'Basil', researchIdea: 'Light', labType: 'volt_lab' })
  mocks.planFindUnique.mockResolvedValue({
    teamId: TEAM,
    lastSyncedText: PLAN_TEXT,
    projectType: 'science',
    projectSubtype: 'biology',
    lastReviewJson: null,
    lastIdeaCheckJson: null,
  })
  mocks.studyPlanFindUnique.mockResolvedValue(null)
  mocks.queryRaw.mockResolvedValue([{ runs_today: 1 }])
  mocks.studyPlanUpdateMany.mockResolvedValue({ count: 1 })
  mocks.planUpdateMany.mockResolvedValue({ count: 1 })
  mocks.ideaCheckCount.mockResolvedValue(0)
  mocks.loadRubric.mockResolvedValue('I. Question (10 pts)')
  mocks.stream.mockReturnValue(fakeStream(REVIEW_LINES))
  mocks.runAiOperation.mockImplementation(async (i: { run: () => Promise<unknown> }) => ({
    ok: true,
    result: await i.run(),
    replayed: false,
  }))
  mocks.recommendTracks.mockResolvedValue([])
})

describe('P1-S9 — codex study plan', () => {
  it('stamps the source it is generating from when it reserves the slot', async () => {
    mocks.studyPlanFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      tracksJson: [],
      manualTrackSlugs: [],
      generatedAt: new Date(),
    })

    await generateStudyPlan({ teamId: TEAM })

    // The reserve SQL carries `pending_source_hash` — without it the commit has
    // nothing to compare against.
    const sql = JSON.stringify(mocks.queryRaw.mock.calls[0]![0])
    expect(sql).toContain('pending_source_hash')
  })

  it('a generation started against an older topic cannot overwrite a newer one', async () => {
    mocks.studyPlanFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      tracksJson: [{ trackSlug: 'newer-track' }],
      manualTrackSlugs: [],
      generatedAt: new Date(),
    })
    // A second generation reserved after us and rewrote `pending_source_hash`,
    // so our compare-and-set matches nothing.
    mocks.studyPlanUpdateMany.mockResolvedValue({ count: 0 })

    const result = await generateStudyPlan({ teamId: TEAM })

    expect(result.ok).toBe(true)
    const where = mocks.studyPlanUpdateMany.mock.calls[0]![0].where
    expect(where).toMatchObject({ teamId: TEAM, pendingSourceHash: expect.any(String) })
    // The caller is handed the newer plan and told it is not their generation.
    expect(result).toMatchObject({ cached: true, tracks: [{ trackSlug: 'newer-track' }] })
  })

  it('routes the paid classifier through the replay ledger, keyed on the source', async () => {
    mocks.studyPlanFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      tracksJson: [],
      manualTrackSlugs: [],
      generatedAt: new Date(),
    })

    await generateStudyPlan({ teamId: TEAM })

    expect(mocks.runAiOperation).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'study_plan_tracks', teamId: TEAM }),
    )
  })

  it('an identical generation already in flight is refused, not bought twice', async () => {
    mocks.studyPlanFindUnique.mockResolvedValue(null)
    mocks.runAiOperation.mockResolvedValue({ ok: false, reason: 'in_flight' })

    const result = await generateStudyPlan({ teamId: TEAM })

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(mocks.studyPlanUpdateMany).not.toHaveBeenCalled()
  })
})

describe('P1-S9 — research-plan review', () => {
  it('claims before paying, and a second reviewer never reaches the provider', async () => {
    mocks.planUpdateMany.mockResolvedValue({ count: 0 }) // claim lost

    const result = await reviewPlan({ teamId: TEAM })

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(mocks.stream).not.toHaveBeenCalled()
  })

  it('a review of text the team has since rewritten is discarded, not shown as current', async () => {
    // The claim succeeds; the commit's compare-and-set does not, because
    // `lastSyncedText` no longer matches what was reviewed.
    mocks.planUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 0 })

    const result = await reviewPlan({ teamId: TEAM })
    expect(result).toMatchObject({ ok: true, kind: 'stream' })
    const events = await drain((result as { stream: ReadableStream }).stream)

    const commit = mocks.planUpdateMany.mock.calls[1]![0]
    expect(commit.where).toMatchObject({
      teamId: TEAM,
      lastSyncedText: PLAN_TEXT,
      projectType: 'science',
      projectSubtype: 'biology',
    })
    expect(events.at(-1)).toMatchObject({ type: 'error' })
    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('an unchanged plan commits and releases the claim in the same write', async () => {
    const result = await reviewPlan({ teamId: TEAM })
    const events = await drain((result as { stream: ReadableStream }).stream)

    expect(events.at(-1)).toMatchObject({ type: 'done' })
    expect(mocks.planUpdateMany.mock.calls[1]![0].data).toMatchObject({ reviewClaimedAt: null })
  })
})

describe('P1-S9 — idea check', () => {
  it('claims BEFORE counting, so the daily cap cannot be read stale', async () => {
    const order: string[] = []
    mocks.planUpdateMany.mockImplementation(async () => {
      order.push('claim')
      return { count: 1 }
    })
    mocks.ideaCheckCount.mockImplementation(async () => {
      order.push('count')
      return 0
    })

    await runIdeaCheck({ teamId: TEAM, dbUserId: 'user_1' })

    expect(order).toEqual(['claim', 'count'])
  })

  it('a second concurrent check is refused before the paid web search', async () => {
    mocks.planUpdateMany.mockResolvedValue({ count: 0 }) // claim lost

    const result = await runIdeaCheck({ teamId: TEAM, dbUserId: 'user_1' })

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(mocks.ideaCheckCount).not.toHaveBeenCalled()
  })

  it('releases the claim when the team is already at its daily cap', async () => {
    mocks.ideaCheckCount.mockResolvedValue(3)

    const result = await runIdeaCheck({ teamId: TEAM, dbUserId: 'user_1' })

    expect(result).toMatchObject({ ok: false, status: 429 })
    // Second call is the release — otherwise the team is wedged for the TTL.
    expect(mocks.planUpdateMany.mock.calls[1]![0].data).toMatchObject({ ideaCheckClaimedAt: null })
  })

  it('the writeback compare-and-sets on the text that was actually searched', async () => {
    mocks.stream.mockReturnValue(fakeStream(VERDICT_JSON))

    const result = await runIdeaCheck({ teamId: TEAM, dbUserId: 'user_1' })
    const events = await drain((result as { stream: ReadableStream }).stream)

    // Call 0 is the claim; call 1 is the writeback, predicated on the source.
    expect(mocks.planUpdateMany.mock.calls[1]![0].where).toMatchObject({
      teamId: TEAM,
      lastSyncedText: PLAN_TEXT,
    })
    expect(events.at(-1)).toMatchObject({ type: 'done', verdict: 'novel' })
  })

  it('a verdict on text the team has since rewritten is discarded', async () => {
    mocks.stream.mockReturnValue(fakeStream(VERDICT_JSON))
    // Claim succeeds; the writeback CAS finds no row with the searched text.
    mocks.planUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 0 })

    const result = await runIdeaCheck({ teamId: TEAM, dbUserId: 'user_1' })
    const events = await drain((result as { stream: ReadableStream }).stream)

    expect(events.at(-1)).toMatchObject({ type: 'error' })
    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('the paid search is still counted against the cap even when the verdict is discarded', async () => {
    mocks.stream.mockReturnValue(fakeStream(VERDICT_JSON))
    mocks.planUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 0 })

    const result = await runIdeaCheck({ teamId: TEAM, dbUserId: 'user_1' })
    await drain((result as { stream: ReadableStream }).stream)

    // Spend, not refund: the web search was bought, so the ledger row exists.
    expect(mocks.ideaCheckCreate).toHaveBeenCalledOnce()
  })
})
