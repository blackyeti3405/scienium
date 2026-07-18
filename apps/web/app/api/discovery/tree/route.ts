import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { hydrateTree, createTreeNodes } from '@/lib/discovery/tree-service'
import { logActivity } from '@/lib/activity/log'

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

  const { kpAwarded, plainCount } = await createTreeNodes({
    teamId: ctx.teamId,
    userId: ctx.dbUserId,
    nodes: data.nodes,
  })

  if (kpAwarded > 0) {
    logActivity(ctx.teamId, ctx.dbUserId, 'discovery_kp_awarded', {
      kp: kpAwarded,
      nodeCount: plainCount,
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true, kpAwarded })
}

// ─── DELETE: reset the whole tree for the team ───────────────────────────────

export async function DELETE(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  await db.discoveryNode.deleteMany({ where: { teamId: ctx.teamId } })
  return NextResponse.json({ ok: true })
}
