import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

const DEFAULT_DAYS = [30, 14, 7, 1]

/**
 * Reminder preferences (spec §13.7).
 *
 * There is no destination field (REFACTOR2 §0.8). The route used to accept any
 * syntactically valid address and store it verbatim, so a student could enable
 * deadline mail addressed to a stranger and the app would send it — school mail,
 * to someone who never asked for it, on a schedule. Clerk is the identity source
 * of truth and the address it verified is the one mirrored into `User.email`, so
 * that is the only destination; `email` here is READ-ONLY, returned so the
 * settings UI can show where reminders go.
 *
 * Chosen over a confirm-link flow deliberately: a verification flow would build
 * a token table, a mailer, and an expiry rule to arrive at an address Clerk has
 * already verified for this same person.
 */

/** GET /api/notifications/prefs — the member's reminder settings + destination. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const [pref, user] = await Promise.all([
    db.notificationPref.findUnique({ where: { userId: ctx.dbUserId } }),
    db.user.findUnique({ where: { id: ctx.dbUserId }, select: { email: true } }),
  ])
  return NextResponse.json({
    emailEnabled: pref?.emailEnabled ?? false,
    email: user?.email ?? null,
    deadlineDays: pref?.deadlineDays ?? DEFAULT_DAYS,
  })
}

// `.strict()`, so a client still sending `email` gets a 400 rather than having
// it silently ignored — the address stops being accepted visibly.
const PrefBody = z
  .object({
    emailEnabled: z.boolean(),
    deadlineDays: z.array(z.number().int().min(1).max(120)).max(8).optional(),
  })
  .strict()

/** PUT /api/notifications/prefs — upsert the member's notification preferences. */
export async function PUT(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PrefBody)
  if (bodyError) return bodyError

  const user = await db.user.findUnique({
    where: { id: ctx.dbUserId },
    select: { email: true, deletedAt: true },
  })
  // No routable account address — an erased user's is a tombstone. Refuse to
  // arm a reminder that can only bounce.
  if (data.emailEnabled && (!user?.email || user.deletedAt)) {
    return NextResponse.json(
      { error: 'Your account has no verified email address to send reminders to.' },
      { status: 400 },
    )
  }

  const deadlineDays = data.deadlineDays?.length
    ? [...new Set(data.deadlineDays)].sort((a, b) => b - a)
    : DEFAULT_DAYS

  const pref = await db.notificationPref.upsert({
    where: { userId: ctx.dbUserId },
    create: { userId: ctx.dbUserId, emailEnabled: data.emailEnabled, deadlineDays },
    update: { emailEnabled: data.emailEnabled, deadlineDays },
  })

  return NextResponse.json({
    emailEnabled: pref.emailEnabled,
    email: user?.email ?? null,
    deadlineDays: pref.deadlineDays,
  })
}
