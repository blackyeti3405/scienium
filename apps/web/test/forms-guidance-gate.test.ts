import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The fail-closed applicability gate (REFACTOR2 §0.8).
 *
 * P0-R4 shipped a 2027 edition whose applicability/timing copy is UNAUTHORED
 * pending a qualified teacher/SRC reviewer, and `lib/fairs/forms.test.ts` used
 * to carry a `describe('fail-closed guidance gate')` naming a mechanism that
 * did not exist: every literal had `appliesTo: null`, the route passed
 * `def.appliesTo` straight through, and nothing consulted the review state. The
 * assertions passed because there was nothing to withhold — which is exactly
 * what a missing gate looks like from the inside.
 *
 * So the edition under test here is SYNTHETIC and DOES carry copy. That is the
 * whole point: only an edition with something to lose can tell a gate from an
 * empty catalog. Each case is an attack on the shipped one —
 *
 *   1. copy authored, nobody signed it            → withheld
 *   2. copy authored, signed, digest matches      → served (the positive control:
 *                                                   without it, `appliesTo: null`
 *                                                   hard-coded in the route would
 *                                                   pass every other case)
 *   3. copy EDITED after the sign-off             → withheld again
 *   4. edition past its re-source date            → withheld, and says so
 *
 * No real ISEF content appears below. `ISEF_EDITION` itself stays unreviewed;
 * that sign-off is the owner's and the mechanism exists to keep its absence
 * visible.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  catalogFindMany: vi.fn(),
  statusFindMany: vi.fn(),
  /**
   * Mutated per test and read by the route at call time. Deliberately NOT the
   * shipped edition — the strings below are invented placeholders.
   */
  edition: {
    season: '2099',
    formsUrl: 'https://example.test/forms/',
    rulesUrl: 'https://example.test/rules/',
    sourcedAt: '2099-01-01',
    expiresAt: '2099-12-31',
    reviewedBy: null as string | null,
    reviewedAt: null as string | null,
    reviewedDigest: null as string | null,
    forms: [
      { code: 'Form A', name: 'Placeholder A', appliesTo: 'Required for every project.' },
      { code: 'Form B', name: 'Placeholder B', appliesTo: 'Only for vertebrate animal research.' },
    ],
  },
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/db', () => ({
  db: {
    formsCatalog: { findMany: mocks.catalogFindMany },
    teamFormStatus: { findMany: mocks.statusFindMany },
  },
}))
vi.mock('@/lib/fairs/forms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/fairs/forms')>()
  // Real gate, synthetic edition — the inverse of mocking the gate itself.
  return { ...actual, ISEF_EDITION: mocks.edition }
})

import { GET } from '@/app/api/fairs/forms/route'
import { guidanceDigest, editionGuidanceState, servedForms } from '@/lib/fairs/forms'
import type { IsefFormsEdition } from '@/lib/fairs/forms'

const edition = mocks.edition as unknown as IsefFormsEdition

function sign() {
  mocks.edition.reviewedBy = 'A. Teacher, SRC chair'
  mocks.edition.reviewedAt = '2099-02-01'
  mocks.edition.reviewedDigest = guidanceDigest(edition)
}

async function get() {
  const res = await GET(new NextRequest('http://app.example.com/api/fairs/forms'))
  return res.json() as Promise<{
    forms: { code: string; appliesTo: string | null }[]
    edition: { guidance: string }
  }>
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1' },
    error: null,
  })
  mocks.statusFindMany.mockResolvedValue([])
  mocks.catalogFindMany.mockImplementation(async ({ where }: { where: { formCode: { in: string[] } } }) =>
    where.formCode.in.map((c) => ({ id: `cat_${c}`, formCode: c })),
  )
  Object.assign(mocks.edition, {
    expiresAt: '2099-12-31',
    reviewedBy: null,
    reviewedAt: null,
    reviewedDigest: null,
    forms: [
      { code: 'Form A', name: 'Placeholder A', appliesTo: 'Required for every project.' },
      { code: 'Form B', name: 'Placeholder B', appliesTo: 'Only for vertebrate animal research.' },
    ],
  })
})

describe('GET /api/fairs/forms — unreviewed applicability copy never reaches a student', () => {
  it('withholds authored appliesTo while nobody has signed the edition', async () => {
    const body = await get()

    expect(body.edition.guidance).toBe('unreviewed')
    expect(body.forms).toHaveLength(2)
    for (const f of body.forms) expect(f.appliesTo).toBeNull()
    // And the copy really is there to leak — otherwise this proves nothing.
    expect(edition.forms.every((f) => f.appliesTo)).toBe(true)
  })

  it('serves it once a qualified reviewer has signed THAT copy', async () => {
    sign()

    const body = await get()

    expect(body.edition.guidance).toBe('reviewed')
    expect(body.forms.map((f) => f.appliesTo)).toEqual([
      'Required for every project.',
      'Only for vertebrate animal research.',
    ])
  })

  it('withholds it again when the copy is edited after the sign-off', async () => {
    sign()
    // The failure this catches: someone tightens the wording of an approved
    // form months later. The sign-off is still on the record and now covers
    // text nobody qualified has read.
    mocks.edition.forms[1]!.appliesTo = 'Only when you culture bacteria at home.'

    const body = await get()

    expect(body.edition.guidance).toBe('stale_review')
    for (const f of body.forms) expect(f.appliesTo).toBeNull()
  })

  it('withholds it once the edition is past its re-source date, review or not', async () => {
    sign()
    mocks.edition.expiresAt = '2020-01-01'

    const body = await get()

    expect(body.edition.guidance).toBe('expired')
    for (const f of body.forms) expect(f.appliesTo).toBeNull()
  })
})

describe('the gate itself (pure)', () => {
  it('a reviewer name alone does not publish copy — the digest must exist too', () => {
    mocks.edition.reviewedBy = 'A. Teacher'
    mocks.edition.reviewedAt = '2099-02-01'
    expect(editionGuidanceState(edition, new Date('2099-06-01'))).toBe('unreviewed')
  })

  it('an unparseable expiry is treated as expired, not as never expiring', () => {
    sign()
    mocks.edition.expiresAt = 'whenever'
    expect(editionGuidanceState(edition, new Date('2099-06-01'))).toBe('expired')
  })

  it('the digest moves when a TITLE changes, not just the applicability line', () => {
    const before = guidanceDigest(edition)
    mocks.edition.forms[0]!.name = 'Placeholder A (rev. 2)'
    expect(guidanceDigest(edition)).not.toBe(before)
  })

  it('withholding replaces the copy without mutating the authored edition', () => {
    const served = servedForms(edition, new Date('2099-06-01'))
    expect(served[0]!.appliesTo).toBeNull()
    expect(edition.forms[0]!.appliesTo).toBe('Required for every project.')
  })
})
