import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { ensureTodayDispatch, computeStreak, FIELD_DISPATCH_KP } from '@/lib/field-dispatch/dispatch'
import { db } from '@/lib/db'

/** Maximum number of past dispatches returned in the history payload. */
const HISTORY_LIMIT = 30

/**
 * GET /api/field-dispatch — today's discipline dispatch for the team's lab type,
 * plus whether THIS student has already answered it, plus a scrollable history
 * of past answered dispatches and a calendar-consecutive answer streak.
 *
 * Field Dispatch is discipline-specific, so it only becomes meaningful once the
 * lab type is assigned (end of literature_review). Before that we report
 * `available: false` and the tab shows a friendly locked state.
 *
 * `history` items have the shape
 * `{ id, body, reflectionQuestion, response, kpAwarded, publishedDate, createdAt }`,
 * most-recent-first, capped at `HISTORY_LIMIT`, excluding today's dispatch (the
 * primary card). `kpAwarded` is read straight off the persisted
 * `FieldDispatchResponse` row — no recompute, no extra LLM/DB cost.
 *
 * Security: history is scoped to `userId: ctx.dbUserId` AND
 * `content.labType: ctx.labType` — no other student's or other lab type's
 * responses can appear in the payload.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'daily' })
  if (error) return error

  if (!ctx.labType) {
    return NextResponse.json({ available: false })
  }

  const content = await ensureTodayDispatch(ctx.labType)
  const existing = await db.fieldDispatchResponse.findUnique({
    where: { userId_contentId: { userId: ctx.dbUserId, contentId: content.id } },
    select: { response: true, kpAwarded: true },
  })

  // Fetch the student's full answer history for this lab type (scoped to this
  // user AND this lab type — the two keys that prevent cross-team/IDOR leakage).
  const allResponses = await db.fieldDispatchResponse.findMany({
    where: {
      userId: ctx.dbUserId,
      content: { labType: ctx.labType },
    },
    select: {
      response: true,
      createdAt: true,
      kpAwarded: true,
      content: {
        select: {
          id: true,
          body: true,
          reflectionQuestion: true,
          publishedDate: true,
        },
      },
    },
    orderBy: { content: { publishedDate: 'desc' } },
    take: HISTORY_LIMIT,
  })

  // Streak uses every answered publishedDate (including today's if present).
  const streak = computeStreak(allResponses.map((r) => r.content.publishedDate))

  // History excludes today's dispatch (already shown as the primary card).
  const history = allResponses
    .filter((r) => r.content.id !== content.id)
    .map((r) => ({
      id: r.content.id,
      body: r.content.body,
      reflectionQuestion: r.content.reflectionQuestion,
      response: r.response,
      kpAwarded: r.kpAwarded,
      publishedDate: r.content.publishedDate.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }))

  return NextResponse.json({
    available: true,
    content: {
      id: content.id,
      body: content.body,
      reflectionQuestion: content.reflectionQuestion,
    },
    responded: !!existing,
    response: existing?.response ?? null,
    kpReward: FIELD_DISPATCH_KP,
    streak,
    history,
  })
}

const RespondBody = z
  .object({
    contentId: z.string().trim().min(1).max(40),
    response: z.string().trim().min(1, 'Write a reflection to earn KP').max(2000),
  })
  .strict()

/**
 * POST /api/field-dispatch — submit the reflection answer. Awards a flat KP to
 * the team, at most once per student per day: the `(userId, contentId)` unique
 * constraint plus the transaction make a double-submit a no-op (no double-pay).
 * The posted contentId must be TODAY's dispatch for the team's lab type, so an
 * old day's id can't be replayed for more KP.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'daily' })
  if (error) return error

  if (!ctx.labType) {
    return NextResponse.json({ error: 'Assign your lab type to unlock Field Dispatch.' }, { status: 409 })
  }

  const { data, error: bodyError } = await parseJson(req, RespondBody)
  if (bodyError) return bodyError

  const today = await ensureTodayDispatch(ctx.labType)
  if (data.contentId !== today.id) {
    return NextResponse.json({ error: "That dispatch is no longer today's." }, { status: 409 })
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.fieldDispatchResponse.create({
        data: {
          userId: ctx.dbUserId,
          contentId: today.id,
          response: data.response,
          kpAwarded: FIELD_DISPATCH_KP,
        },
      })
      await tx.teamCurrency.upsert({
        where: { teamId: ctx.teamId },
        create: { teamId: ctx.teamId, kp: FIELD_DISPATCH_KP },
        update: { kp: { increment: FIELD_DISPATCH_KP } },
      })
    })
  } catch (err) {
    // Unique violation → already answered today; treat as success, award nothing.
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ kpAwarded: 0, alreadyResponded: true })
    }
    throw err
  }

  return NextResponse.json({ kpAwarded: FIELD_DISPATCH_KP, alreadyResponded: false })
}
