import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'

// GET: the team's chosen final research topic (null if not set yet).
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const body = await req.json()
  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''

  await db.team.update({
    where: { id: ctx.teamId },
    data: { topic: topic || null },
  })

  return NextResponse.json({ topic: topic || null })
}
