import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

// #11: widened to also accept `interestLevel` (student-set interest tier).
// Both fields optional so one endpoint serves star-toggle AND interest-marking;
// an empty body (neither field present) is rejected below.
const PatchBody = z
  .object({
    starred: z.boolean().optional(),
    interestLevel: z.enum(['high', 'mid', 'low']).nullable().optional(),
  })
  .strict()

// ─── PATCH: update a node (star toggle and/or #11 interest tier) ─────────────

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  // IDOR guard (unchanged): the node must belong to the caller's team.
  const node = await db.discoveryNode.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true },
  })
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await parseJson(req, PatchBody)
  if (error) return error

  // Build the update from whichever fields are actually present in the parsed
  // body — `interestLevel: null` is a valid value (clears the mark), so we
  // check key presence rather than truthiness.
  const updateData: { starred?: boolean; interestLevel?: string | null } = {}
  if ('starred' in data && data.starred !== undefined) updateData.starred = data.starred
  if ('interestLevel' in data) updateData.interestLevel = data.interestLevel ?? null

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  await db.discoveryNode.update({
    where: { id: params.id },
    data: updateData,
  })

  return NextResponse.json({ ok: true })
}

// ─── DELETE: remove a node and its entire subtree ────────────────────────────

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

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
