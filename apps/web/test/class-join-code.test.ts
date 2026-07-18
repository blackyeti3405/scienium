import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Classroom join-code expiry (SEC2-003): an expired code must resolve exactly
 * like an invalid one (generic not-found — no oracle for probing whether a
 * code exists), and a code row without an expiry fails CLOSED (every mint
 * sets one; null can only mean pre-migration drift).
 */

const mocks = vi.hoisted(() => ({
  classFindUnique: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    class: { findUnique: mocks.classFindUnique },
  },
}))

import { resolveClass } from '@/lib/onboarding/profile'
import { classJoinCodeExpiry, CLASS_JOIN_CODE_TTL_DAYS } from '@/lib/team/invite'

const KLASS = { id: 'class_1', schoolId: 'school_1' }
const future = new Date(Date.now() + 60_000)
const past = new Date(Date.now() - 60_000)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveClass expiry (SEC2-003)', () => {
  it('resolves a live code', async () => {
    mocks.classFindUnique.mockResolvedValue({ ...KLASS, joinCodeExpiresAt: future })
    expect(await resolveClass('k7m9qp')).toEqual({ classId: 'class_1', schoolId: 'school_1' })
    // Lookup is normalized (trim + uppercase) like every other code path.
    expect(mocks.classFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { joinCode: 'K7M9QP' } }),
    )
  })

  it('an expired code resolves null — indistinguishable from an invalid code', async () => {
    mocks.classFindUnique.mockResolvedValue({ ...KLASS, joinCodeExpiresAt: past })
    expect(await resolveClass('K7M9QP')).toBeNull()
  })

  it('a code with no expiry fails closed', async () => {
    mocks.classFindUnique.mockResolvedValue({ ...KLASS, joinCodeExpiresAt: null })
    expect(await resolveClass('K7M9QP')).toBeNull()
  })

  it('an unknown code resolves null without touching expiry logic', async () => {
    mocks.classFindUnique.mockResolvedValue(null)
    expect(await resolveClass('NOPE99')).toBeNull()
  })

  it('a blank code never queries', async () => {
    expect(await resolveClass('   ')).toBeNull()
    expect(await resolveClass(null)).toBeNull()
    expect(mocks.classFindUnique).not.toHaveBeenCalled()
  })
})

describe('classJoinCodeExpiry', () => {
  it('mints the documented TTL from now', () => {
    const now = new Date('2026-07-17T12:00:00Z')
    const expiry = classJoinCodeExpiry(now)
    const days = (expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    expect(days).toBe(CLASS_JOIN_CODE_TTL_DAYS)
  })
})
