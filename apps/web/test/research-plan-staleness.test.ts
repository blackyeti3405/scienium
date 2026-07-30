import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Two halves of REFACTOR2 P2-S7, both against `/api/research-plan`.
 *
 * 1. **The client/server nullability mismatch.** `useResearchPlan`'s Save Text
 *    path is deliberately usable with no project type picked (`canSaveText`
 *    checks only that the textarea is non-empty) and serializes its state
 *    verbatim — `projectType: null` — into a schema that accepted only
 *    `string | undefined`. Reproduced against the pre-fix schema: a plain
 *    "paste some text and save" POST returned 400
 *    `projectType: Expected string, received null`, surfaced to the student as
 *    "Could not save the text". The client is right; the schema now says so.
 *
 * 2. **Old AI results looking current.** The review commits a compare-and-set on
 *    the text it graded (P1-S9), which covers a review that finishes AFTER the
 *    text changed. It does not cover the other order: the review commits
 *    legitimately, THEN the student saves new text — and both GET and POST kept
 *    handing that review back beside the new text with nothing marking it. The
 *    stored `planHash` (already there since PERF-7) is the marker.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  ideaChecksUsedToday: vi.fn(() => Promise.resolve(0)),
  logActivityBestEffort: vi.fn(() => Promise.resolve()),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/activity/log', () => ({ logActivityBestEffort: mocks.logActivityBestEffort }))
vi.mock('@/lib/research-plan/idea-check', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/research-plan/idea-check')>()),
  ideaChecksUsedToday: mocks.ideaChecksUsedToday,
}))
vi.mock('@/lib/db', () => ({
  db: { researchPlan: { findUnique: mocks.findUnique, upsert: mocks.upsert } },
}))

import { GET, POST } from '@/app/api/research-plan/route'
import { planHashOf } from '@/lib/research-plan/plan-hash'

const OLD_TEXT = 'My original plan about mould on bread.'
const NEW_TEXT = 'My rewritten plan about solar panel angles.'

/** A stored row, with a review stamped against whichever text is passed. */
function planRow(opts: { text: string; reviewedText: string; type?: string | null }) {
  const type = opts.type ?? 'experimental'
  const reviewHash = planHashOf({
    projectType: type,
    projectSubtype: 'controlled',
    lastSyncedText: opts.reviewedText,
  })
  return {
    teamId: 'team_1',
    googleDocUrl: null,
    projectType: type,
    projectSubtype: 'controlled',
    lastSyncedAt: new Date('2026-01-01'),
    lastSyncedText: opts.text,
    lastSyncedSource: 'paste',
    lastReviewJson: { planHash: reviewHash, overall: null, sections: [] },
    lastReviewedAt: new Date('2026-01-01'),
    lastIdeaCheckJson: { planHash: reviewHash, verdict: 'novel', findings: [] },
    lastIdeaCheckAt: new Date('2026-01-01'),
  }
}

function planReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://app.example.com/api/research-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const getReq = () => new NextRequest('http://app.example.com/api/research-plan')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1' },
    error: null,
  })
  mocks.ideaChecksUsedToday.mockResolvedValue(0)
})

describe('POST /api/research-plan — the client may send null for an unpicked type', () => {
  it('saves pasted text with projectType/projectSubtype null (was an unconditional 400)', async () => {
    mocks.upsert.mockImplementation(async ({ update }) => ({
      ...planRow({ text: update.lastSyncedText, reviewedText: update.lastSyncedText }),
      ...update,
      lastReviewJson: null,
      lastIdeaCheckJson: null,
    }))

    const res = await POST(planReq({ planText: NEW_TEXT, projectType: null, projectSubtype: null }))
    expect(res.status).toBe(200)
    expect(mocks.upsert).toHaveBeenCalledTimes(1)
    const body = await res.json()
    expect(body.plan.projectType).toBeNull()
  })

  it('still rejects a non-string that is not null', async () => {
    const res = await POST(planReq({ planText: NEW_TEXT, projectType: 42 }))
    expect(res.status).toBe(400)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})

describe('a stored AI result stops looking current when the text changes', () => {
  it('GET marks the review and idea check stale after the plan was rewritten', async () => {
    mocks.findUnique.mockResolvedValue(planRow({ text: NEW_TEXT, reviewedText: OLD_TEXT }))
    const body = await (await GET(getReq())).json()
    // Still returned — it is the team's work, and hiding it would lose it.
    expect(body.plan.lastReview).not.toBeNull()
    expect(body.plan.lastReviewStale).toBe(true)
    expect(body.plan.lastIdeaCheckStale).toBe(true)
  })

  it('GET does NOT cry stale when the review matches the current text', async () => {
    mocks.findUnique.mockResolvedValue(planRow({ text: OLD_TEXT, reviewedText: OLD_TEXT }))
    const body = await (await GET(getReq())).json()
    expect(body.plan.lastReviewStale).toBe(false)
    expect(body.plan.lastIdeaCheckStale).toBe(false)
  })

  it('a legacy result with no stamp is not accused of being stale', async () => {
    const row = planRow({ text: NEW_TEXT, reviewedText: OLD_TEXT })
    mocks.findUnique.mockResolvedValue({
      ...row,
      lastReviewJson: { overall: null, sections: [] },
      lastIdeaCheckJson: null,
    })
    const body = await (await GET(getReq())).json()
    expect(body.plan.lastReviewStale).toBe(false)
    expect(body.plan.lastIdeaCheckStale).toBe(false)
  })

  it('re-picking the project type also invalidates the review', async () => {
    // The rubric the review was graded against is chosen by the type, so the
    // hash covers it — the same rule the PERF-7 cache already used.
    mocks.findUnique.mockResolvedValue({
      ...planRow({ text: OLD_TEXT, reviewedText: OLD_TEXT }),
      projectType: 'engineering',
    })
    const body = await (await GET(getReq())).json()
    expect(body.plan.lastReviewStale).toBe(true)
  })

  it('the SAVE response itself reports the review it just superseded', async () => {
    // The sharp case: the POST that replaces the text is the exact moment the
    // old review stopped applying, and its own response is what the client
    // renders next. Pre-fix that response carried `lastReview` with no flag at
    // all (and omitted the idea check entirely).
    mocks.upsert.mockImplementation(async ({ update }) => ({
      ...planRow({ text: OLD_TEXT, reviewedText: OLD_TEXT }),
      ...update,
    }))
    const body = await (await POST(planReq({ planText: NEW_TEXT }))).json()
    expect(body.plan.lastReview).not.toBeNull()
    expect(body.plan.lastReviewStale).toBe(true)
    expect(body.plan.lastIdeaCheckStale).toBe(true)
    expect(body.plan).toHaveProperty('lastIdeaCheckAt')
  })
})
