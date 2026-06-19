import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

const PatchBody = z.object({ starred: z.boolean() }).strict()

// ─── PATCH: update a node (currently: toggle star) ───────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const node = await db.discoveryNode.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true },
  })
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await parseJson(req, PatchBody)
  if (error) return error

  await db.discoveryNode.update({
    where: { id: params.id },
    data: { starred: data.starred },
  })

  return NextResponse.json({ ok: true })
}

// ─── DELETE: remove a node and its entire subtree ────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  // Collect the node + all descendants via BFS over the team's nodes.
  const all = await db.discoveryNode.findMany({
    where: { teamId: ctx.teamId },
    select: { id: true, parentId: true },
  })
  if (!all.some((n) => n.id === params.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const toDelete = new Set<string>()
  const queue = [params.id]
  while (queue.length) {
    const id = queue.shift()!
    toDelete.add(id)
    all.filter((n) => n.parentId === id).forEach((n) => queue.push(n.id))
  }

  // Delete deepest-first isn't required (no FK ordering issue with a flat
  // deleteMany on the id set), so one call suffices.
  await db.discoveryNode.deleteMany({
    where: { teamId: ctx.teamId, id: { in: [...toDelete] } },
  })

  return NextResponse.json({ ok: true })
}
