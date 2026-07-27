import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, cuid } from '@/lib/validation'
import { db } from '@/lib/db'
import {
  scheduleNext,
  selectDueCards,
  VOCAB_MASTERY_BOX,
  VOCAB_KP_PER_TERM,
  VOCAB_DAILY_KP_CAP,
} from '@/lib/literature/srs'
import { recordActivity } from '@/lib/activity/log'
import { todayUtc } from '@/lib/date'

const ReviewBody = z
  .object({
    cardId: cuid,
    grade: z.enum(['again', 'hard', 'good', 'easy']),
  })
  .strict()

/**
 * POST /api/literature/vocab/review — grades one card (self-reported), pure-
 * function scheduling via `scheduleNext`, and a once-ever mastery KP claim.
 * ZERO LLM.
 *
 * ANTI-FARM GATE (the load-bearing invariant): a card whose `dueAt > now`
 * is refused with 409 — no schedule change, no KP. The server never trusts
 * a client-supplied box/interval; the client sends only the grade. This is
 * what makes a repeatable review loop unfarmable: a student cannot grind a
 * deck in one sitting, because the server will not accept a second review
 * of the same card until real time has passed.
 *
 * PAYMENT ORDER (deliberately different from app/api/ops/codex/complete/
 * route.ts, which this route otherwise copies in shape): the schedule
 * (box/dueAt/reviewCount/lapses/lastReviewedAt) is persisted UNCONDITIONALLY,
 * in its OWN update, OUTSIDE the KP transaction. The review itself always
 * happened and must never be rolled back by a KP daily-cap miss — only the
 * KP *payout* is gated by the cap. The codex route pays and completes in the
 * SAME transaction because a codex lesson's "completion" and its KP are the
 * same event; here, "the student reviewed the card" and "the student earned
 * mastery KP for it" are two different events that must not share a
 * rollback boundary.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'literature' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, ReviewBody)
  if (bodyError) return bodyError
  const { cardId, grade } = data

  const card = await db.vocabCard.findUnique({ where: { id: cardId } })
  // Per-student ownership guard — another student's card (or another
  // team's) is Not Found, never readable, never gradeable.
  if (!card || card.userId !== ctx.dbUserId || card.teamId !== ctx.teamId) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  const now = new Date()
  if (card.dueAt.getTime() > now.getTime()) {
    return NextResponse.json({ error: 'This card is not due yet.' }, { status: 409 })
  }

  const next = scheduleNext({ box: card.box, lapses: card.lapses, reviewCount: card.reviewCount }, grade, now)

  // Persist the schedule unconditionally, in its own update — the review
  // happened; a KP daily-cap miss must NOT roll back the scheduling.
  await db.vocabCard.update({
    where: { id: card.id },
    data: {
      box: next.box,
      dueAt: next.dueAt,
      reviewCount: { increment: 1 },
      lapses: next.lapses,
      lastReviewedAt: now,
    },
  })

  let kpEarned = 0
  let capReached = false

  const eligible = next.box >= VOCAB_MASTERY_BOX && card.kpAwarded === 0
  if (eligible) {
    const today = todayUtc()
    class CapSlotUnavailable extends Error {}
    let outcome: 'paid' | 'duplicate' | 'cap' = 'paid'
    try {
      await db.$transaction(async (tx) => {
        // Claim the once-ever term-mastery payment. An empty RETURNING set
        // means a concurrent request already paid this card — pay nothing.
        const claimRows = await tx.$queryRaw<{ kp_awarded: number }[]>(Prisma.sql`
          UPDATE "vocab_cards"
          SET kp_awarded = ${VOCAB_KP_PER_TERM}, updated_at = now()
          WHERE id = ${card.id} AND kp_awarded = 0
          RETURNING kp_awarded
        `)
        if (claimRows.length === 0) {
          outcome = 'duplicate'
          return
        }

        // Atomically claim a daily-cap slot: insert-or-increment, but only
        // when doing so keeps the day's total under the cap. Races are
        // resolved by RETURNING-set emptiness, never by catching a unique
        // violation inside the transaction (25P02 lesson from the codex route).
        const capRows = await tx.$queryRaw<{ kp_awarded: number }[]>(Prisma.sql`
          INSERT INTO "vocab_kp_days" (id, user_id, team_id, day, kp_awarded, updated_at)
          VALUES (gen_random_uuid()::text, ${ctx.dbUserId}, ${ctx.teamId}, ${today}, ${VOCAB_KP_PER_TERM}, now())
          ON CONFLICT (user_id, team_id, day) DO UPDATE
            SET kp_awarded = "vocab_kp_days".kp_awarded + ${VOCAB_KP_PER_TERM}, updated_at = now()
            WHERE "vocab_kp_days".kp_awarded + ${VOCAB_KP_PER_TERM} <= ${VOCAB_DAILY_KP_CAP}
          RETURNING kp_awarded
        `)
        if (capRows.length === 0) {
          // Lost the race for the last cap slot — abort so the card's KP
          // claim above rolls back too (the card stays unpaid and can earn
          // its KP tomorrow; the schedule update above is already committed
          // and is NOT part of this transaction).
          throw new CapSlotUnavailable()
        }

        await tx.teamCurrency.upsert({
          where: { teamId: ctx.teamId },
          create: { teamId: ctx.teamId, kp: VOCAB_KP_PER_TERM },
          update: { kp: { increment: VOCAB_KP_PER_TERM } },
        })
        // Durable (REFACTOR2 P1-R5): the once-ever mastery KP and its record
        // commit together — if the cap slot above didn't fire, we never reach
        // here (the CapSlotUnavailable throw rolls this back with everything else).
        await recordActivity(tx, ctx.teamId, ctx.dbUserId, 'vocab_term_mastered', { term: card.term })
      })
    } catch (err) {
      if (!(err instanceof CapSlotUnavailable)) throw err
      outcome = 'cap'
    }

    if (outcome === 'paid') {
      kpEarned = VOCAB_KP_PER_TERM
    } else if (outcome === 'cap') {
      capReached = true
    }
  }

  // Recompute the due count the same way the deck view does (capped,
  // ordered) so the client can update its badge without a full reload.
  const remaining = await db.vocabCard.findMany({
    where: { userId: ctx.dbUserId, teamId: ctx.teamId },
    select: { dueAt: true, box: true, termKey: true },
  })
  const remainingDue = selectDueCards(remaining, now).length

  return NextResponse.json({
    box: next.box,
    dueAt: next.dueAt,
    kpEarned,
    capReached,
    remainingDue,
  })
}
