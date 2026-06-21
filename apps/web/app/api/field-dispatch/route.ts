import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { ensureTodayDispatch, FIELD_DISPATCH_KP } from '@/lib/field-dispatch/dispatch'
import { db } from '@/lib/db'

/**
 * GET /api/field-dispatch — today's discipline dispatch for the team's lab type,
 * plus whether THIS student has already answered it.
 *
 * Field Dispatch is discipline-specific, so it only becomes meaningful once the
 * lab type is assigned (end of literature_review). Before that we report
 * `available: false` and the tab shows a friendly locked state.
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
