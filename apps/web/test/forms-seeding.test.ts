import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * ISEF forms delivery (REFACTOR2 P0-R4 + P1-R16).
 *
 * The catalog correction in v0.34.0 is only real if it actually reaches a
 * database that was seeded under the old, wrong edition. Two mechanisms carry
 * it, and both are invisible from `forms.ts`'s own content tests:
 *
 *   1. `ensureFormsSeeded` keys on CODE COVERAGE, not row count. The old
 *      `count >= ISEF_FORMS.length` fast path would have returned early on a
 *      12-row database and never inserted the 2027 codes.
 *   2. The GET route serves names from the authored edition and filters to it,
 *      so retired codes (Form 1C, Form 2) stop being served even though their
 *      rows survive for `TeamFormStatus` foreign keys.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  catalogFindMany: vi.fn(),
  catalogCreateMany: vi.fn(
    (_args: { data: { formCode: string }[]; skipDuplicates?: boolean }) =>
      Promise.resolve({ count: 0 }),
  ),
  statusFindMany: vi.fn((): Promise<unknown[]> => Promise.resolve([])),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/db', () => ({
  db: {
    formsCatalog: { findMany: mocks.catalogFindMany, createMany: mocks.catalogCreateMany },
    teamFormStatus: { findMany: mocks.statusFindMany },
  },
}))

import { ensureFormsSeeded } from '@/lib/fairs/forms-server'
import { GET } from '@/app/api/fairs/forms/route'
import { ISEF_EDITION } from '@/lib/fairs/forms'

/** The 2026 catalog this correction had to overwrite — same size, wrong codes. */
const LEGACY_CODES = [
  'Form 1', 'Form 1A', 'Form 1B', 'Form 1C', 'Form 2', 'Form 3', 'Form 4',
  'Form 5A', 'Form 5B', 'Form 6A', 'Form 6B', 'Form 7',
]

const ACTIVE_CODES = ISEF_EDITION.forms.map((f) => f.code)

/** Rows the team-scoped catalog query would return for a given stored set. */
function catalogRows(stored: string[]) {
  return async ({ where }: { where: { formCode: { in: string[] } } }) =>
    where.formCode.in
      .filter((c) => stored.includes(c))
      .map((c) => ({ id: `cat_${c.replace(/\s/g, '_')}`, formCode: c, name: 'stored name' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.catalogCreateMany.mockResolvedValue({ count: 0 })
  mocks.statusFindMany.mockResolvedValue([])
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1' },
    error: null,
  })
})

describe('ensureFormsSeeded — coverage, not count (P1-R16)', () => {
  it('seeds the missing 2027 codes into a database holding the 12 legacy ones', async () => {
    mocks.catalogFindMany.mockImplementation(catalogRows(LEGACY_CODES))

    await ensureFormsSeeded()

    expect(mocks.catalogCreateMany).toHaveBeenCalledTimes(1)
    const inserted = mocks.catalogCreateMany.mock.calls[0]![0].data
    const codes = inserted.map((d) => d.formCode)
    // Exactly the codes the legacy set lacks — 2A/2B/2C and the renamed 5A/5B.
    expect(codes).toContain('Form 2A')
    expect(codes).toContain('Form 2B')
    expect(codes).toContain('Form 2C')
    // Codes the legacy DB already has are not re-inserted.
    expect(codes).not.toContain('Form 1')
    expect(codes).not.toContain('Form 3')
  })

  // The exact failure the old fast path caused: same row count ⇒ no repair.
  it('does not short-circuit on a same-size legacy catalog', async () => {
    mocks.catalogFindMany.mockImplementation(catalogRows(LEGACY_CODES))
    expect(LEGACY_CODES.length).toBe(12)

    await ensureFormsSeeded()

    expect(mocks.catalogCreateMany).toHaveBeenCalled()
  })

  it('is a no-op once every active code is present', async () => {
    mocks.catalogFindMany.mockImplementation(catalogRows(ACTIVE_CODES))

    await ensureFormsSeeded()

    expect(mocks.catalogCreateMany).not.toHaveBeenCalled()
  })

  it('inserts with skipDuplicates so a concurrent seed cannot duplicate a code', async () => {
    mocks.catalogFindMany.mockImplementation(catalogRows([]))

    await ensureFormsSeeded()

    expect(mocks.catalogCreateMany.mock.calls[0]![0].skipDuplicates).toBe(true)
  })
})

describe('GET /api/fairs/forms — serves the active edition only (P0-R4)', () => {
  function formsReq(): NextRequest {
    return new NextRequest('http://app.example.com/api/fairs/forms')
  }

  it('never serves a retired code, even while its row survives', async () => {
    // A database still holding every legacy row plus the new ones.
    mocks.catalogFindMany.mockImplementation(catalogRows([...LEGACY_CODES, ...ACTIVE_CODES]))

    const res = await GET(formsReq())
    const { forms } = await res.json()
    const codes = forms.map((f: { code: string }) => f.code)

    expect(codes).not.toContain('Form 1C')
    expect(codes).not.toContain('Form 2')
    expect(codes).toEqual(ACTIVE_CODES)
  })

  it('serves the AUTHORED name, not the stale one stored in the row', async () => {
    mocks.catalogFindMany.mockImplementation(catalogRows(ACTIVE_CODES))

    const { forms } = await (await GET(formsReq())).json()
    const form1 = forms.find((f: { code: string }) => f.code === 'Form 1')

    expect(form1.name).toBe('Checklist for Adult Sponsor/Safety Assessment Form')
    expect(form1.name).not.toBe('stored name')
  })

  it('ships no applicability copy while the edition is unreviewed', async () => {
    mocks.catalogFindMany.mockImplementation(catalogRows(ACTIVE_CODES))

    const body = await (await GET(formsReq())).json()

    expect(body.edition.reviewed).toBe(false)
    expect(body.edition.season).toBe('2027')
    for (const f of body.forms) expect(f.appliesTo).toBeNull()
  })

  it('drops a code that has no row rather than emitting a form with no id', async () => {
    // Seeding raced or partially failed — serve what exists, never a null id.
    mocks.catalogFindMany.mockImplementation(catalogRows(['Form 1', 'Form 1A']))

    const { forms } = await (await GET(formsReq())).json()

    expect(forms.map((f: { code: string }) => f.code)).toEqual(['Form 1', 'Form 1A'])
    for (const f of forms) expect(f.id).toBeTruthy()
  })

  it('is team-scoped: statuses are read for the caller team only', async () => {
    mocks.catalogFindMany.mockImplementation(catalogRows(ACTIVE_CODES))

    await GET(formsReq())

    expect(mocks.statusFindMany).toHaveBeenCalledWith({ where: { teamId: 'team_1' } })
  })
})
