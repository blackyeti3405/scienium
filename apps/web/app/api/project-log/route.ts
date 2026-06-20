import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

const Body = z.object({
  body: z.string().min(1).max(5000),
  nextSteps: z.string().min(1).max(2000),
  stage: z.string().max(100).optional(),
  // Bounded to avoid storage-bloat; ids are further intersected with the
  // team's actual roster before persisting (see POST).
  attendeeIds: z.array(z.string().max(64)).max(50).default([]),
  // Relative streaming paths into our own attachment view route. Bounded in
  // both count and length so a single entry can't store an unbounded blob.
  attachmentUrls: z
    .array(z.string().max(400).startsWith('/api/project-log/attachment/view'))
    .min(1, 'At least one photo is required')
    .max(20),
}).strict()

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const me = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })

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
        createdBy: { select: { id: true, name: true } },
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

  return NextResponse.json({ entries, members: memberList, labType: ctx.labType, currentUserId: me?.id ?? null })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  // Keep only attendee ids that are genuinely on this team — a client can't
  // record arbitrary or other-team user ids as present.
  const requestedAttendees = data.attendeeIds ?? []
  let attendeeIds: string[] = []
  if (requestedAttendees.length > 0) {
    const members = await db.teamMember.findMany({
      where: { teamId: ctx.teamId, userId: { in: requestedAttendees } },
      select: { userId: true },
    })
    attendeeIds = members.map((m) => m.userId)
  }

  // Count existing entries to compute the entry number for this new one
  const existingCount = await db.projectLog.count({
    where: { teamId: ctx.teamId, entryType: 'progress' },
  })

  const entry = await db.projectLog.create({
    data: {
      teamId: ctx.teamId,
      createdByUserId: dbUser.id,
      entryType: 'progress',
      body: data.body.trim(),
      nextSteps: data.nextSteps.trim(),
      stage: data.stage?.trim() || null,
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
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ entry: { ...entry, entryNumber: existingCount + 1 } }, { status: 201 })
}
