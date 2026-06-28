import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { logActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

const Body = z.object({
  body: z.string().min(1).max(5000),
  nextSteps: z.string().min(1).max(2000),
  stage: z.string().min(1, 'Select a project stage').max(100),
  // Bounded to avoid storage-bloat; ids are further intersected with the
  // team's actual roster before persisting (see POST). Attendance is required
  // for multi-member teams (enforced in the handler, which knows the roster).
  attendeeIds: z.array(z.string().max(64)).max(50).default([]),
  // Relative streaming paths into our own attachment view route. Bounded in
  // both count and length so a single entry can't store an unbounded blob.
  attachmentUrls: z
    .array(z.string().max(400).startsWith('/api/project-log/attachment/view'))
    .min(1, 'At least one photo is required')
    .max(20),
}).strict()

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const [rows, members] = await Promise.all([
    db.projectLog.findMany({
      where: { teamId: ctx.teamId, entryType: 'progress' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        body: true,
        nextSteps: true,
        stage: true,
        attendeeIds: true,
        attachmentUrls: true,
        createdAt: true,
        lastEditedAt: true,
        createdBy: { select: { id: true, name: true } },
        lastEditedBy: { select: { id: true, name: true } },
      },
    }),
    db.teamMember.findMany({
      where: { teamId: ctx.teamId },
      orderBy: { joinedAt: 'asc' },
      select: { userId: true, user: { select: { name: true } } },
    }),
  ])

  // Number entries 1-based (oldest first, which is the query order)
  const entries = rows.map((r, i) => ({ ...r, entryNumber: i + 1 })).reverse()

  const memberList = members.map((m) => ({ userId: m.userId, name: m.user.name }))

  return NextResponse.json({ entries, members: memberList, labType: ctx.labType, currentUserId: ctx.dbUserId })
}

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  // Keep only attendee ids that are genuinely on this team, and require
  // attendance for multi-member teams (solo labs have an implicit attendee).
  const roster = await db.teamMember.findMany({
    where: { teamId: ctx.teamId },
    select: { userId: true },
  })
  const rosterIds = new Set(roster.map((m) => m.userId))
  const attendeeIds = (data.attendeeIds ?? []).filter((id) => rosterIds.has(id))
  if (roster.length > 1 && attendeeIds.length === 0) {
    return NextResponse.json({ error: 'Select who was present' }, { status: 400 })
  }

  // Count existing entries to compute the entry number for this new one
  const existingCount = await db.projectLog.count({
    where: { teamId: ctx.teamId, entryType: 'progress' },
  })

  const entry = await db.projectLog.create({
    data: {
      teamId: ctx.teamId,
      createdByUserId: ctx.dbUserId,
      entryType: 'progress',
      body: data.body.trim(),
      nextSteps: data.nextSteps.trim(),
      stage: data.stage.trim(),
      attendeeIds,
      attachmentUrls: data.attachmentUrls,
    },
    select: {
      id: true,
      body: true,
      nextSteps: true,
      stage: true,
      attendeeIds: true,
      attachmentUrls: true,
      createdAt: true,
      lastEditedAt: true,
      createdBy: { select: { id: true, name: true } },
      lastEditedBy: { select: { id: true, name: true } },
    },
  })

  logActivity(ctx.teamId, ctx.dbUserId, 'log_created', { kind: 'progress' }).catch(console.error)

  // +1 LC the first time this member files a log today (real calendar day, team pool).
  try {
    const today = new Date()
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    await db.$transaction(async (tx) => {
      await tx.labCreditClaim.create({ data: { userId: ctx.dbUserId, teamId: ctx.teamId, day } })
      await tx.teamCurrency.update({ where: { teamId: ctx.teamId }, data: { lc: { increment: 1 } } })
    })
  } catch {
    // P2002 (claim already exists today) = already credited; ignore. Never block the log.
  }

  return NextResponse.json({ entry: { ...entry, entryNumber: existingCount + 1 } }, { status: 201 })
}
