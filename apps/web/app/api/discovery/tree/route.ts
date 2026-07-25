import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { hydrateTree, createTreeNodes, TreeGraphError } from '@/lib/discovery/tree-service'
import { consumeDestructive, proposeDestructive } from '@/lib/api/destructive-proposal'
import { logActivityBestEffort } from '@/lib/activity/log'

// Bounded batch of client-generated nodes; `.strict()` rejects extra fields.
// `source` nodes (Discovery v2 Papers tab) carry external metadata fields that the
// server re-derives (host + tier) before persisting — see createTreeNodes.
// `article` nodes (The Conversation / journalism RSS) carry their own metadata
// fields; `html` is re-sanitized server-side on this write path too.
const TreeBody = z
  .object({
    nodes: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(64),
            title: z.string().max(500),
            parentId: z.string().trim().max(64).nullable(),
            source: z.enum(['wikipedia', 'youtube', 'source', 'article']).optional(),
            videoId: z.string().trim().max(32).optional(),
            // ── source-node fields (only read when source === 'source') ──
            platform: z.enum(['arxiv', 'pubmed', 'pmc', 'openalex']).optional(),
            externalId: z.string().trim().max(64).optional(),
            sourceUrl: z.string().trim().max(2000).optional(),
            sourceHost: z.string().trim().max(255).optional(),
            authors: z.array(z.string().max(300)).max(50).optional(),
            abstract: z.string().max(20000).optional(),
            publishedAt: z.string().trim().max(64).optional(),
            // ── article-node fields (only read when source === 'article') ──
            provider: z.enum(['the_conversation', 'journalism', 'explainer', 'patents']).optional(),
            renderMode: z.enum(['full', 'linkout']).optional(),
            sourceName: z.string().trim().max(120).optional(),
            articleUrl: z.string().trim().max(2000).optional(),
            excerpt: z.string().max(2000).optional(),
            html: z.string().max(200000).optional(),
            articleAuthor: z.string().trim().max(300).optional(),
          })
          .strict(),
      )
      .min(1, 'nodes array required')
      .max(200),
  })
  .strict()

// ─── GET: load the team's discovery tree ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const nodes = await hydrateTree(ctx.teamId)
  return NextResponse.json({ nodes })
}

// ─── POST: create one or more nodes (root or branch children) ────────────────

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, TreeBody)
  if (error) return error

  let kpAwarded: number
  let plainCount: number
  try {
    // Rejects foreign-team parents and cycles before any write (P1-R10). A
    // failed node is now an error, not a logged exception behind `{ ok: true }`.
    ;({ kpAwarded, plainCount } = await createTreeNodes({
      teamId: ctx.teamId,
      userId: ctx.dbUserId,
      nodes: data.nodes,
    }))
  } catch (err) {
    if (err instanceof TreeGraphError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  if (kpAwarded > 0) {
    logActivityBestEffort(ctx.teamId, ctx.dbUserId, 'discovery_kp_awarded', {
      kp: kpAwarded,
      nodeCount: plainCount,
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true, kpAwarded })
}

// ─── DELETE: reset the whole tree for the team ───────────────────────────────
//
// TWO-PHASE, server-owned (REFACTOR2 P1-R1). This used to wipe every node the
// moment any member called it — shared work, destroyed by a bare request, with
// the only confirmation living in a UI dialog the caller need never open.
//
//   - Without `?token=`: destroys nothing. Returns 409 with the node count and a
//     single-use proposal token so the client can show a real warning.
//   - With a valid `?token=`: consumes the proposal and wipes.
//
// The proposal is bound to the actor, the team, and the exact node set that
// existed when it was issued, so a token minted for a 3-node tree cannot be
// replayed later to wipe 300.
export async function DELETE(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const nodes = await db.discoveryNode.findMany({
    where: { teamId: ctx.teamId },
    select: { id: true },
  })
  const nodeIds = nodes.map((n) => n.id)

  // Nothing to destroy — no confirmation theatre for a no-op.
  if (nodeIds.length === 0) return NextResponse.json({ ok: true, removedCount: 0 })

  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    const proposalToken = await proposeDestructive({
      teamId: ctx.teamId,
      actorUserId: ctx.dbUserId,
      command: 'discovery_tree_reset',
      targetIds: nodeIds,
    })
    return NextResponse.json(
      { requiresConfirmation: true, proposalToken, nodeCount: nodeIds.length },
      { status: 409 },
    )
  }

  const consumed = await consumeDestructive({
    token,
    teamId: ctx.teamId,
    actorUserId: ctx.dbUserId,
    command: 'discovery_tree_reset',
    targetIds: nodeIds,
  })
  if (!consumed.ok) {
    return NextResponse.json(
      { error: 'That reset confirmation is no longer valid. Try again.' },
      { status: 409 },
    )
  }

  const removed = await db.discoveryNode.deleteMany({
    where: { teamId: ctx.teamId, id: { in: nodeIds } },
  })
  return NextResponse.json({ ok: true, removedCount: removed.count })
}
