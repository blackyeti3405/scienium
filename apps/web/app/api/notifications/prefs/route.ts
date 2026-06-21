import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

const DEFAULT_DAYS = [30, 14, 7, 1]

/** GET /api/notifications/prefs — the member's email + deadline-window settings. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const pref = await db.notificationPref.findUnique({ where: { userId: ctx.dbUserId } })
  return NextResponse.json({
    emailEnabled: pref?.emailEnabled ?? false,
    email: pref?.email ?? null,
    deadlineDays: pref?.deadlineDays ?? DEFAULT_DAYS,
  })
}

const PrefBody = z
  .object({
    emailEnabled: z.boolean(),
    email: z.string().trim().email().max(200).optional().nullable(),
    deadlineDays: z.array(z.number().int().min(1).max(120)).max(8).optional(),
  })
  .strict()

/** PUT /api/notifications/prefs — upsert the member's notification preferences. */
export async function PUT(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PrefBody)
  if (bodyError) return bodyError

  // Enabling email requires an address to send to.
  if (data.emailEnabled && !data.email) {
    return NextResponse.json({ error: 'Add an email address to enable email reminders.' }, { status: 400 })
  }

  const deadlineDays = data.deadlineDays?.length
    ? [...new Set(data.deadlineDays)].sort((a, b) => b - a)
    : DEFAULT_DAYS

  const pref = await db.notificationPref.upsert({
    where: { userId: ctx.dbUserId },
    create: {
      userId: ctx.dbUserId,
      emailEnabled: data.emailEnabled,
      email: data.email ?? null,
      deadlineDays,
    },
    update: {
      emailEnabled: data.emailEnabled,
      email: data.email ?? null,
      deadlineDays,
    },
  })

  return NextResponse.json({
    emailEnabled: pref.emailEnabled,
    email: pref.email,
    deadlineDays: pref.deadlineDays,
  })
}
