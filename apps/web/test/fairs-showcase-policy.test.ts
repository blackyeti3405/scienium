import { beforeEach, describe, expect, it } from 'vitest'
import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'

/**
 * Route-policy matrix — fairs + showcase-asset families.
 * See test/harness/route-policy.ts.
 *
 * The two fairs routes are the survey's flagged pair: their `[id]` lookups hit
 * GLOBAL catalog tables (`Fair`, `FormsCatalog`), so `{ id }`-only is correct
 * there — the team boundary lives elsewhere. These tests pin exactly that
 * elsewhere: sync-deadlines' own-state gate (BLK-5) and the forms upsert
 * writing only the caller's team row.
 */

import { POST as syncPOST } from '@/app/api/fairs/[id]/sync-deadlines/route'
import { PATCH as formPATCH } from '@/app/api/fairs/forms/[formId]/route'
import { DELETE as assetDELETE } from '@/app/api/showcase/asset/[id]/route'

let h: RoutePolicyHarness

describe('POST /api/fairs/[id]/sync-deadlines (AI-adjacent: Firecrawl)', () => {
  beforeEach(() => {
    h = routeHarness()
    for (const t of h.rows('team')) t.locationState = 'TX'
    h.seed('fair', {
      id: 'fair_intl',
      name: 'ISEF',
      level: 'international',
      state: null,
      websiteUrl: null, // stops the happy path at 400, before Firecrawl
    })
    h.seed('fair', {
      id: 'fair_ca',
      name: 'CA State Fair',
      level: 'state',
      state: 'CA',
      websiteUrl: 'https://ca.example.test',
    })
  })

  it("404s a real fair OUTSIDE the team's state (the BLK-5 gate)", () =>
    h.asStudentA().post(syncPOST, 'fair_ca').expect(404))
  it('admits an international fair (stops at 400: no website to scrape)', () =>
    h.asStudentA().post(syncPOST, 'fair_intl').expect(400))
  it('404s a nonexistent fair', () => h.asStudentA().post(syncPOST, 'fair_nope').expect(404))
  it('401s signed out', () => h.anonymous().post(syncPOST, 'fair_intl').expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().post(syncPOST, 'fair_intl').expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().post(syncPOST, 'fair_intl').expect(429))
})

describe('PATCH /api/fairs/forms/[formId]', () => {
  const DONE = { body: { status: 'complete' } }
  beforeEach(() => {
    h = routeHarness()
    h.seed('formsCatalog', { id: 'form_1', name: 'Form 1A' })
  })

  it("upserts the CALLER's team row only", async () => {
    await h.asStudentA().patch(formPATCH, { formId: 'form_1' }, DONE).expect(200)
    const rows = h.rows('teamFormStatus')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ teamId: h.ids.teamA, status: 'complete' })
  })
  it('404s a nonexistent form', () =>
    h.asStudentA().patch(formPATCH, { formId: 'form_nope' }, DONE).expect(404))
  it('401s signed out', () => h.anonymous().patch(formPATCH, { formId: 'form_1' }, DONE).expect(401))
  it('403s cross-origin', () =>
    h.asStudentA().crossOrigin().patch(formPATCH, { formId: 'form_1' }, DONE).expect(403))
  it('429s over the tier', () =>
    h.asStudentA().overLimit().patch(formPATCH, { formId: 'form_1' }, DONE).expect(429))
})

describe('DELETE /api/showcase/asset/[id]', () => {
  beforeEach(() => {
    h = routeHarness()
    h.seed('showcaseAsset', {
      id: 'asset_a',
      assetType: 'image',
      fileUrl: 'uploads/a.png',
      showcase: { teamId: h.ids.teamA },
    })
    h.seed('showcaseAsset', {
      id: 'asset_b',
      assetType: 'image',
      fileUrl: 'uploads/b.png',
      showcase: { teamId: h.ids.teamB },
    })
  })

  it('deletes its own asset', async () => {
    await h.asStudentA().delete(assetDELETE, 'asset_a').expect(200)
    expect(h.rows('showcaseAsset').map((a) => a.id)).toEqual(['asset_b'])
  })
  it("404s ANOTHER team's real asset and deletes nothing", async () => {
    await h.asStudentA().delete(assetDELETE, 'asset_b').expect(404)
    expect(h.rows('showcaseAsset')).toHaveLength(2)
  })
  it('401s signed out', () => h.anonymous().delete(assetDELETE, 'asset_a').expect(401))
  it('403s cross-origin', () => h.asStudentA().crossOrigin().delete(assetDELETE, 'asset_a').expect(403))
  it('429s over the tier', () => h.asStudentA().overLimit().delete(assetDELETE, 'asset_a').expect(429))
})
