import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `PATCH /api/settings` must reject before it writes (REFACTOR2 P2-S7).
 *
 * Reproduced against the pre-fix handler: it applied the name (and mirrored it
 * to Clerk), the research idea and the lab name IN THAT ORDER, and
 * only then asked whether the ZIP mapped to a US state. A single PATCH carrying
 * a good name, a good lab name and a bad ZIP came back 400 with four writes
 * already committed — the caller is told the update failed while most of it
 * landed, which is the shape that makes a settings form untrustworthy.
 *
 * These pin the ATTACK: a body whose LAST field is invalid, asserted against
 * the writes that were attempted, not against the response alone.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  teamFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  teamUpdate: vi.fn(),
  transaction: vi.fn(),
  syncClerkDisplayName: vi.fn(),
  geocodeZip: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/onboarding/profile', () => ({
  syncClerkDisplayName: mocks.syncClerkDisplayName,
}))
vi.mock('@/lib/fairs/zip', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/fairs/zip')>()),
  geocodeZip: mocks.geocodeZip,
}))
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    team: { findUnique: mocks.teamFindUnique, update: mocks.teamUpdate },
    $transaction: mocks.transaction,
  },
}))

import { PATCH } from '@/app/api/settings/route'

const LEAD = 'user_lead'

function patchReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://app.example.com/api/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Every write the handler attempted, in order, whether inside the tx or not. */
let writes: string[] = []

beforeEach(() => {
  vi.clearAllMocks()
  writes = []
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: LEAD, userId: 'clerk_1' },
    error: null,
  })
  mocks.teamFindUnique.mockResolvedValue({
    teamLeadId: LEAD,
    name: 'Old Lab',
    locationZip: null,
    locationState: null,
    researchIdea: null,
  })
  mocks.userFindUnique.mockResolvedValue({ name: 'Old Name', school: null })
  mocks.userUpdate.mockImplementation(async () => {
    writes.push('user.update')
    return {}
  })
  mocks.teamUpdate.mockImplementation(async () => {
    writes.push('team.update')
    return {}
  })
  mocks.geocodeZip.mockResolvedValue([41.7, -72.6] as const)
  // Run the callback with the same model mocks, so a write inside the
  // transaction is recorded exactly like one outside it.
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      user: { update: mocks.userUpdate },
      team: { update: mocks.teamUpdate },
    }),
  )
})

describe('PATCH /api/settings — a student cannot set a school', () => {
  it('rejects a body carrying `school` instead of silently ignoring it', async () => {
    // Students no longer supply a school anywhere: the field was only ever read
    // by the withdrawn `school_only` showcase tier, so it was identifying data
    // on a minor with no consumer. `.strict()` makes removing it from the schema
    // a REFUSAL rather than a quiet drop, so a stale client can't keep writing.
    const res = await PATCH(patchReq({ name: 'New Name', school: 'Central High' }))
    expect(res.status).toBe(400)
    expect(writes).toEqual([])
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/settings — nothing is applied unless everything validates', () => {
  it('a bad ZIP alongside good fields writes NOTHING', async () => {
    const res = await PATCH(
      patchReq({ name: 'New Name', labName: 'New Lab', zip: '00000' }),
    )
    expect(res.status).toBe(400)
    // Pre-fix: ['user.update', 'team.update'] plus a Clerk sync, all committed.
    expect(writes).toEqual([])
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.syncClerkDisplayName).not.toHaveBeenCalled()
  })

  it('does not push a name to Clerk that the database rejected', async () => {
    await PATCH(patchReq({ name: 'New Name', zip: '00000' }))
    // The Clerk mirror is an OUTBOUND side effect on someone else's system —
    // it cannot be rolled back, so it must not happen before the commit.
    expect(mocks.syncClerkDisplayName).not.toHaveBeenCalled()
  })

  it('a valid PATCH commits every field in ONE transaction', async () => {
    const res = await PATCH(
      patchReq({ name: 'New Name', labName: 'New Lab', zip: '06001' }),
    )
    expect(res.status).toBe(200)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    // One user write and one team write — not the four separate round-trips the
    // pre-fix handler made, each independently committable.
    expect(writes.filter((w) => w === 'user.update')).toHaveLength(1)
    expect(writes.filter((w) => w === 'team.update')).toHaveLength(1)
    expect(mocks.teamUpdate.mock.calls[0]![0].data).toMatchObject({
      name: 'New Lab',
      locationZip: '06001',
      locationState: 'CT',
      locationLat: 41.7,
    })
    // Clerk is mirrored only once the DB has actually accepted the change.
    expect(mocks.syncClerkDisplayName).toHaveBeenCalledWith('clerk_1', 'New Name')
  })

  it('geocoding happens BEFORE the transaction opens, never inside it', async () => {
    let geocodedDuringTx = false
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const before = mocks.geocodeZip.mock.calls.length
      const out = await fn({ user: { update: mocks.userUpdate }, team: { update: mocks.teamUpdate } })
      geocodedDuringTx = mocks.geocodeZip.mock.calls.length > before
      return out
    })
    await PATCH(patchReq({ zip: '06001' }))
    expect(mocks.geocodeZip).toHaveBeenCalledTimes(1)
    expect(geocodedDuringTx).toBe(false) // never hold a transaction across the network
  })
})
