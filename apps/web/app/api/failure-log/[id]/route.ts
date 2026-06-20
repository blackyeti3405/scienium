import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

const Body = z.object({
  happened: z.string().min(1).max(1500),
  learned: z.string().min(1).max(1500),
}).strict()

// PATCH — edit a failure entry. Author-only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const existing = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'failure' },
    select: { id: true, createdByUserId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (existing.createdByUserId !== dbUser.id) {
    return NextResponse.json({ error: 'You can only edit your own entries' }, { status: 403 })
  }

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  const entry = await db.projectLog.update({
    where: { id: existing.id },
    data: { body: JSON.stringify({ happened: data.happened.trim(), learned: data.learned.trim() }) },
    select: {
      id: true,
      body: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  let parsed = { happened: entry.body, learned: '' }
  try { parsed = JSON.parse(entry.body) } catch {}

  return NextResponse.json({
    entry: {
      id: entry.id,
      ...parsed,
      createdAt: entry.createdAt,
      author: entry.createdBy.name,
      authorId: entry.createdBy.id,
    },
  })
}

// DELETE — remove a failure entry. Author-only.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const existing = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'failure' },
    select: { id: true, createdByUserId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (existing.createdByUserId !== dbUser.id) {
    return NextResponse.json({ error: 'You can only delete your own entries' }, { status: 403 })
  }

  await db.projectLog.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
