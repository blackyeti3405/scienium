import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

const Body = z.object({
  body: z.string().min(1).max(2000),
  stage: z.string().max(100).optional(),
}).strict()

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const entries = await db.projectLog.findMany({
    where: { teamId: ctx.teamId, entryType: 'progress' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      body: true,
      stage: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  })

  return NextResponse.json({ entries })
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

  const entry = await db.projectLog.create({
    data: {
      teamId: ctx.teamId,
      createdByUserId: dbUser.id,
      entryType: 'progress',
      body: data.body.trim(),
      stage: data.stage?.trim() || null,
    },
    select: {
      id: true,
      body: true,
      stage: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  })

  return NextResponse.json({ entry }, { status: 201 })
}
