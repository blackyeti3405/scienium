import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { deleteObject } from '@/lib/storage'
import { logActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

const Body = z.object({
  body: z.string().min(1).max(5000),
  nextSteps: z.string().min(1).max(2000),
  stage: z.string().min(1, 'Select a project stage').max(100),
  attendeeIds: z.array(z.string().max(64)).max(50).default([]),
  attachmentUrls: z
    .array(z.string().max(400).startsWith('/api/project-log/attachment/view'))
    .min(1, 'At least one photo is required')
    .max(20),
}).strict()

/** Pull the R2 object key back out of an attachment view URL. */
function keyFromUrl(url: string): string | null {
  const m = url.match(/[?&]key=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

// PATCH — edit an existing progress entry. Author-only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Logs are shared across the team — any member may edit any entry.
  const existing = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'progress' },
    select: { id: true, attachmentUrls: true },
  })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  // Keep only attendee ids that are genuinely on this team.
  // Keep only real team members, and require attendance for multi-member teams.
  const roster = await db.teamMember.findMany({
    where: { teamId: ctx.teamId },
    select: { userId: true },
  })
  const rosterIds = new Set(roster.map((m) => m.userId))
  const attendeeIds = (data.attendeeIds ?? []).filter((id) => rosterIds.has(id))
  if (roster.length > 1 && attendeeIds.length === 0) {
    return NextResponse.json({ error: 'Select who was present' }, { status: 400 })
  }

  const entry = await db.projectLog.update({
    where: { id: existing.id },
    data: {
      body: data.body.trim(),
      nextSteps: data.nextSteps.trim(),
      stage: data.stage.trim(),
      attendeeIds,
      attachmentUrls: data.attachmentUrls,
      lastEditedByUserId: dbUser.id,
      lastEditedAt: new Date(),
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

  // Best-effort cleanup of attachments removed during the edit.
  const removed = existing.attachmentUrls.filter((u) => !data.attachmentUrls.includes(u))
  await Promise.allSettled(
    removed.map((u) => {
      const key = keyFromUrl(u)
      return key ? deleteObject(key) : Promise.resolve()
    }),
  )

  logActivity(ctx.teamId, dbUser.id, 'log_edited', { kind: 'progress' }).catch(console.error)

  return NextResponse.json({ entry })
}

// DELETE — remove a progress entry and its attachments. Author-only.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Shared log — any team member may delete; the act is recorded in the feed.
  const existing = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'progress' },
    select: { id: true, attachmentUrls: true },
  })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  await db.projectLog.delete({ where: { id: existing.id } })

  await Promise.allSettled(
    existing.attachmentUrls.map((u) => {
      const key = keyFromUrl(u)
      return key ? deleteObject(key) : Promise.resolve()
    }),
  )

  logActivity(ctx.teamId, dbUser.id, 'log_deleted', { kind: 'progress' }).catch(console.error)

  return NextResponse.json({ ok: true })
}
