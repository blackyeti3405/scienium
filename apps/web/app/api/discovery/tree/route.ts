import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'

// ─── GET: load the team's discovery tree ─────────────────────────────────────

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const rows = await db.discoveryNode.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { visitedAt: 'asc' },
    select: {
      id: true,
      parentId: true,
      sourceType: true,
      wikipediaTitle: true,
      youtubeVideoId: true,
      youtubeTitle: true,
      starred: true,
      visitedAt: true,
    },
  })

  // Derive `depth` (parent-chain length) and `explored` (has children) so the
  // client store gets the same shape it had in localStorage.
  const byId = new Map(rows.map((r) => [r.id, r]))
  const hasChildren = new Set(rows.map((r) => r.parentId).filter(Boolean) as string[])

  function depthOf(id: string): number {
    let d = 0
    let cur = byId.get(id)
    while (cur?.parentId) {
      d += 1
      cur = byId.get(cur.parentId)
    }
    return d
  }

  const nodes = rows.map((r) => ({
    id: r.id,
    title: r.wikipediaTitle ?? r.youtubeTitle ?? '',
    source: r.sourceType,
    videoId: r.youtubeVideoId ?? undefined,
    parentId: r.parentId,
    depth: depthOf(r.id),
    starred: r.starred,
    explored: hasChildren.has(r.id),
    addedAt: r.visitedAt.getTime(),
  }))

  return NextResponse.json({ nodes })
}

// ─── POST: create one or more nodes (root or branch children) ────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const incoming: Array<{
    id: string
    title: string
    parentId: string | null
    source?: 'wikipedia' | 'youtube'
    videoId?: string
  }> = body.nodes ?? []
  if (!incoming.length) {
    return NextResponse.json({ error: 'nodes array required' }, { status: 400 })
  }

  await db.discoveryNode.createMany({
    data: incoming.map((n) => {
      const source = n.source ?? 'wikipedia'
      return {
        id: n.id,
        teamId: ctx.teamId,
        parentId: n.parentId,
        sourceType: source,
        wikipediaTitle: source === 'wikipedia' ? n.title : null,
        youtubeTitle: source === 'youtube' ? n.title : null,
        youtubeVideoId: source === 'youtube' ? n.videoId ?? null : null,
        visitedByUserId: dbUser.id,
      }
    }),
    skipDuplicates: true,
  })

  return NextResponse.json({ ok: true })
}

// ─── DELETE: reset the whole tree for the team ───────────────────────────────

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  await db.discoveryNode.deleteMany({ where: { teamId: ctx.teamId } })
  return NextResponse.json({ ok: true })
}
