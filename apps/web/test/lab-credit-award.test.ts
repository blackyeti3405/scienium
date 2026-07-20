import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

/**
 * Failure-injection tests for the daily LC award (A6): only a verified Prisma
 * P2002 may read as "already paid" — every other DB failure gets one retry,
 * then a structured redacted event and an explicit `failed` outcome. The old
 * inline `catch {}` treated a timeout or missing currency row as a duplicate
 * claim and silently, permanently dropped the member's credit.
 */

const txn = vi.fn()
vi.mock('@/lib/db', () => ({
  db: { $transaction: (...args: unknown[]) => txn(...args) },
}))

const logEvent = vi.fn()
vi.mock('@/lib/observability/log', () => ({
  logEvent: (...args: unknown[]) => logEvent(...args),
}))

import { awardDailyLabCredit } from '@/lib/economy/lab-credit'

const INPUT = { teamId: 'team_1', dbUserId: 'user_1' }

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  })
}

beforeEach(() => {
  txn.mockReset()
  logEvent.mockReset()
})

describe('awardDailyLabCredit', () => {
  it('awards on success', async () => {
    txn.mockResolvedValueOnce(undefined)
    await expect(awardDailyLabCredit(INPUT)).resolves.toBe('awarded')
    expect(logEvent).not.toHaveBeenCalled()
  })

  it('maps ONLY P2002 to already_claimed (no retry, no error event)', async () => {
    txn.mockRejectedValueOnce(p2002())
    await expect(awardDailyLabCredit(INPUT)).resolves.toBe('already_claimed')
    expect(txn).toHaveBeenCalledTimes(1)
    expect(logEvent).not.toHaveBeenCalled()
  })

  it('retries a transient non-P2002 failure and still awards', async () => {
    txn.mockRejectedValueOnce(new Error('connection reset')).mockResolvedValueOnce(undefined)
    await expect(awardDailyLabCredit(INPUT)).resolves.toBe('awarded')
    expect(txn).toHaveBeenCalledTimes(2)
    expect(logEvent).not.toHaveBeenCalled()
  })

  it('reports failed + emits a redacted event when a non-P2002 error persists', async () => {
    txn.mockRejectedValue(new Error('transaction aborted'))
    await expect(awardDailyLabCredit(INPUT)).resolves.toBe('failed')
    expect(txn).toHaveBeenCalledTimes(2)
    expect(logEvent).toHaveBeenCalledTimes(1)
    const event = logEvent.mock.calls[0]![0] as Record<string, unknown>
    expect(event.event).toBe('lab_credit.award_failed')
    expect(event.outcome).toBe('error')
    expect(event.teamId).toBe('team_1')
    // Redaction: the event must never carry the raw error message/payload.
    expect(JSON.stringify(event)).not.toContain('transaction aborted')
  })

  it('never mistakes a P2025 (missing currency row path) for already_claimed', async () => {
    const p2025 = new Prisma.PrismaClientKnownRequestError('No TeamCurrency found', {
      code: 'P2025',
      clientVersion: 'test',
    })
    txn.mockRejectedValue(p2025)
    await expect(awardDailyLabCredit(INPUT)).resolves.toBe('failed')
    expect(logEvent).toHaveBeenCalledTimes(1)
  })
})
