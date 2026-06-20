import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

// Body is stored as JSON string: { happened, learned }
const Body = z.object({
  happened: z.string().min(1).max(1500),
  learned: z.string().min(1).max(1500),
}).strict()

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const me = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })

  const rows = await db.projectLog.findMany({
    where: { teamId: ctx.teamId, entryType: 'failure' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      body: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  // body is stored as JSON: { happened, learned }
  const entries = rows.map((r) => {
    let parsed = { happened: r.body, learned: '' }
    try { parsed = JSON.parse(r.body) } catch {}
    return { id: r.id, ...parsed, createdAt: r.createdAt, author: r.createdBy.name, authorId: r.createdBy.id }
  })

  return NextResponse.json({ entries, currentUserId: me?.id ?? null })
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
      entryType: 'failure',
      body: JSON.stringify({ happened: data.happened.trim(), learned: data.learned.trim() }),
    },
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
  }, { status: 201 })
}
