import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

// An empty/absent topic clears it; cap the length otherwise.
const TopicBody = z.object({ topic: z.string().max(300).optional() }).strict()

// GET: the team's chosen final research topic (null if not set yet).
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { topic: true },
  })

  return NextResponse.json({ topic: team?.topic ?? null })
}

// POST: set (or clear) the team's final research topic.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { data, error } = await parseJson(req, TopicBody)
  if (error) return error
  const topic = (data.topic ?? '').trim()

  await db.team.update({
    where: { id: ctx.teamId },
    data: { topic: topic || null },
  })

  return NextResponse.json({ topic: topic || null })
}
