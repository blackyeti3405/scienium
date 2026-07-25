import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `POST /api/research-plan` must persist the CANONICAL Google Docs URL, never
 * the pasted string (REFACTOR2 P1-S12).
 *
 * `extractGoogleDocId`'s own tests prove the parser rejects a hostile URL. This
 * pins the other half: for a URL that legitimately passes, what lands in the
 * database — and therefore in the teacher view's "Open research plan" link — is
 * rebuilt from the document id, not echoed from user input.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  fetchGoogleDocText: vi.fn(),
  upsert: vi.fn(),
  logActivityBestEffort: vi.fn(() => Promise.resolve()),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/activity/log', () => ({ logActivityBestEffort: mocks.logActivityBestEffort }))
vi.mock('@/lib/research-plan/google-doc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/research-plan/google-doc')>()),
  fetchGoogleDocText: mocks.fetchGoogleDocText,
}))
vi.mock('@/lib/db', () => ({
  db: { researchPlan: { upsert: mocks.upsert } },
}))

import { POST } from '@/app/api/research-plan/route'
import { GoogleDocError } from '@/lib/research-plan/google-doc'

const REAL_ID = '1AbC_dEf-GhIjKlMnOpQrStUvWxYz0123456789'
const CANONICAL = `https://docs.google.com/document/d/${REAL_ID}/edit`

function planReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://app.example.com/api/research-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1' },
    error: null,
  })
  mocks.fetchGoogleDocText.mockResolvedValue({ text: 'My plan.', canonicalUrl: CANONICAL })
  mocks.upsert.mockImplementation(async ({ create, update }) => ({
    id: 'plan_1',
    teamId: 'team_1',
    googleDocUrl: update?.googleDocUrl ?? create?.googleDocUrl ?? null,
    lastSyncedText: 'My plan.',
    lastSyncedAt: new Date(),
    lastSyncedSource: 'google_doc',
    projectType: null,
    projectSubtype: null,
    lastReviewJson: null,
  }))
})

describe('POST /api/research-plan — Google Doc path (P1-S12)', () => {
  it('stores the canonical URL, not the tracking-laden one the student pasted', async () => {
    const pasted = `https://docs.google.com/document/d/${REAL_ID}/edit?usp=sharing&foo=bar#heading=h.x`

    await POST(planReq({ googleDocUrl: pasted }))

    const written = mocks.upsert.mock.calls[0]![0]
    expect(written.update.googleDocUrl).toBe(CANONICAL)
    expect(written.update.googleDocUrl).not.toContain('usp=sharing')
    expect(written.update.googleDocUrl).not.toContain('foo=bar')
  })

  it('the persisted URL comes from the fetcher, never from the request body', async () => {
    // A pasted string the parser accepts, but whose canonical form differs.
    await POST(planReq({ googleDocUrl: `https://docs.google.com/document/d/${REAL_ID}` }))

    expect(mocks.upsert.mock.calls[0]![0].update.googleDocUrl).toBe(CANONICAL)
  })

  it('surfaces a rejected URL as the fetcher’s status, storing nothing', async () => {
    mocks.fetchGoogleDocText.mockRejectedValue(
      new GoogleDocError('That is not a Google Docs link', 400),
    )

    const res = await POST(planReq({ googleDocUrl: 'https://evil.example/?next=docs.google.com/document/d/x' }))

    expect(res.status).toBe(400)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('the paste-text path stores no doc URL at all', async () => {
    await POST(planReq({ planText: 'Typed straight in.' }))

    expect(mocks.fetchGoogleDocText).not.toHaveBeenCalled()
    expect(mocks.upsert.mock.calls[0]![0].update).not.toHaveProperty('googleDocUrl')
  })
})
