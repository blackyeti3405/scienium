import 'server-only'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logEvent } from '@/lib/observability/log'

/**
 * Daily Lab-Credit award — the once-per-member-per-calendar-day +1 LC for
 * filing a project or failure log. Shared by both log routes so the money rule
 * lives in exactly one place (A6 / SVC-1 direction).
 *
 * The duplicate-claim rule is the schema's `@@unique([userId, day])` on
 * `LabCreditClaim`; ONLY a verified Prisma `P2002` on that constraint means
 * "already paid today". Every other failure (timeout, connection loss,
 * transaction abort) is a real error: it gets one retry, then a redacted
 * structured event, and reports `failed` so the caller can surface an explicit
 * recoverable state instead of silently dropping the member's LC.
 */
export type LabCreditAwardOutcome = 'awarded' | 'already_claimed' | 'failed'

export async function awardDailyLabCredit(input: {
  teamId: string
  dbUserId: string
}): Promise<LabCreditAwardOutcome> {
  const today = new Date()
  const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await db.$transaction(async (tx) => {
        await tx.labCreditClaim.create({
          data: { userId: input.dbUserId, teamId: input.teamId, day },
        })
        // Upsert, not update: a missing currency row is a data gap, and must
        // surface as a created row — never masquerade as "already claimed".
        await tx.teamCurrency.upsert({
          where: { teamId: input.teamId },
          create: { teamId: input.teamId, lc: 1 },
          update: { lc: { increment: 1 } },
        })
      })
      return 'awarded'
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return 'already_claimed'
      }
      if (attempt === 1) continue
      logEvent({
        event: 'lab_credit.award_failed',
        outcome: 'error',
        userId: input.dbUserId,
        teamId: input.teamId,
        attempts: attempt,
        detail: err instanceof Error ? err.constructor.name : 'UnknownError',
      })
      return 'failed'
    }
  }
  return 'failed'
}
