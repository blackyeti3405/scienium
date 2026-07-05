import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { hostToTier } from '@/lib/discovery/credibility'
import { sanitizeAbstract } from '@/lib/discovery/sanitize'
import { awardDiscoveryVisit } from '@/lib/discovery/awardVisit'
import { logActivity } from '@/lib/activity/log'

// Bounded batch of client-generated nodes; `.strict()` rejects extra fields.
// `source` nodes (Discovery v2 Papers tab) carry external metadata fields that the
// server re-derives (host + tier) before persisting — see the POST $transaction.
const TreeBody = z
  .object({
    nodes: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(64),
            title: z.string().max(500),
            parentId: z.string().trim().max(64).nullable(),
            source: z.enum(['wikipedia', 'youtube', 'source']).optional(),
            videoId: z.string().trim().max(32).optional(),
            // ── source-node fields (only read when source === 'source') ──
            platform: z.enum(['arxiv', 'pubmed', 'pmc']).optional(),
            externalId: z.string().trim().max(64).optional(),
            sourceUrl: z.string().trim().max(2000).optional(),
            sourceHost: z.string().trim().max(255).optional(),
            authors: z.array(z.string().max(300)).max(50).optional(),
            abstract: z.string().max(20000).optional(),
            publishedAt: z.string().trim().max(64).optional(),
          })
          .strict(),
      )
      .min(1, 'nodes array required')
      .max(200),
  })
  .strict()

// `sourceUrl` is persisted and later rendered as an <a href>. Allow only real
// navigable schemes — reject javascript:/data:/etc. (defense-in-depth: source
// nodes normally come from our own resolve route, which only emits https URLs).
function isHttpUrl(u: string): boolean {
  try {
    const { protocol } = new URL(u)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

// ─── GET: load the team's discovery tree ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

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
      externalId: true,
      paperId: true,
      starred: true,
      interestLevel: true,
      visitedAt: true,
      // Left-join the source side-row so the tree + reader hydrate without a
      // second fetch (host/tier/url/title/abstract all present up front).
      externalSource: {
        select: {
          platform: true,
          externalId: true,
          sourceUrl: true,
          sourceTitle: true,
          sourceAuthors: true,
          sourceHost: true,
          publishedAt: true,
          credibilityTier: true,
          abstract: true,
          reflection: true,
        },
      },
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

  const nodes = rows.map((r) => {
    const es = r.externalSource
    return {
      id: r.id,
      title: es?.sourceTitle ?? r.wikipediaTitle ?? r.youtubeTitle ?? '',
      source: r.sourceType,
      videoId: r.youtubeVideoId ?? undefined,
      parentId: r.parentId,
      depth: depthOf(r.id),
      starred: r.starred,
      // #11: student-set interest tier ('high'|'mid'|'low'|null) — a separate
      // visual channel from `credibilityTier`, surfaced on every GET so it
      // persists across reload (never localStorage).
      interestLevel: r.interestLevel ?? null,
      explored: hasChildren.has(r.id),
      addedAt: r.visitedAt.getTime(),
      // Source-node metadata (undefined for wiki/youtube rows).
      externalId: r.externalId ?? undefined,
      platform: es?.platform ?? undefined,
      sourceUrl: es?.sourceUrl ?? undefined,
      sourceHost: es?.sourceHost ?? undefined,
      credibilityTier: es?.credibilityTier ?? undefined,
      abstract: es?.abstract ?? undefined,
      authors: es?.sourceAuthors ?? undefined,
      publishedAt: es?.publishedAt ? es.publishedAt.toISOString() : undefined,
      reflection: es?.reflection ?? undefined,
      // #13: promotion marker (hides the Promote control once set).
      paperId: r.paperId ?? null,
    }
  })

  return NextResponse.json({ nodes })
}

// ─── POST: create one or more nodes (root or branch children) ────────────────

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, TreeBody)
  if (error) return error
  const incoming = data.nodes

  // wiki/youtube go through the bulk createMany path UNCHANGED. `source` nodes
  // each need an atomic node + side-row write, so they're split out below.
  const plain = incoming.filter((n) => (n.source ?? 'wikipedia') !== 'source')
  const sources = incoming.filter((n) => n.source === 'source')

  // Running total of KP credited on this request (wiki/youtube first-visits).
  // `source` nodes award later, on reflection completion — never on create.
  let kpAwarded = 0

  if (plain.length > 0) {
    await db.discoveryNode.createMany({
      data: plain.map((n) => {
        const source = n.source ?? 'wikipedia'
        return {
          id: n.id,
          teamId: ctx.teamId,
          parentId: n.parentId,
          sourceType: source,
          wikipediaTitle: source === 'wikipedia' ? n.title : null,
          youtubeTitle: source === 'youtube' ? n.title : null,
          youtubeVideoId: source === 'youtube' ? n.videoId ?? null : null,
          visitedByUserId: ctx.dbUserId,
        }
      }),
      skipDuplicates: true,
    })

    // First-visit KP for wiki/youtube nodes. `createMany` can't tell us which
    // rows were actually inserted (vs skipped as dupes), so the visit ledger's
    // @@unique([teamId, nodeId]) is the sole idempotency gate: a P2002 in
    // awardDiscoveryVisit makes re-clicks / re-branches free. Tier is null
    // (base ×1). Each award is its own $transaction so one capped/dup node can't
    // roll back another's credit. Wiki/youtube nodes carry no tier.
    for (const n of plain) {
      try {
        const { kpAwarded: got } = await db.$transaction((tx) =>
          awardDiscoveryVisit(tx, { teamId: ctx.teamId, userId: ctx.dbUserId, nodeId: n.id, tier: null }),
        )
        kpAwarded += got
      } catch (err) {
        console.error('[discovery/tree] visit award skipped:', err)
      }
    }
  }

  // ── Source-node branch (atomic node + externalSource side-row) ──────────────
  // Each source node is created in a $transaction so the node and its metadata
  // row are all-or-nothing (epic §"Client coupling"). Host + tier are RE-DERIVED
  // server-side from the URL/host (anti-forgery — never trust client-sent tier).
  // Dedup via @@unique([teamId, externalId]): a team can't double-add a work; the
  // second attempt is a no-op (the client navigates to the existing node).
  for (const n of sources) {
    // Guard required fields (zod makes them optional since they're source-only).
    if (!n.externalId || !n.platform || !n.sourceUrl || !n.sourceHost) continue
    // sourceUrl is rendered as an href — drop non-http(s) schemes (XSS defense).
    if (!isHttpUrl(n.sourceUrl)) continue

    const existing = await db.discoveryNode.findFirst({
      where: { teamId: ctx.teamId, externalId: n.externalId },
      select: { id: true },
    })
    if (existing) continue // dedup: skip, client already knows the existing node

    const tier = hostToTier(n.sourceHost) // server is the sole tier authority
    const publishedAt = n.publishedAt ? new Date(n.publishedAt) : null

    try {
      await db.$transaction(async (tx) => {
        await tx.discoveryNode.create({
          data: {
            id: n.id,
            teamId: ctx.teamId,
            parentId: n.parentId,
            sourceType: 'source',
            externalId: n.externalId,
            visitedByUserId: ctx.dbUserId,
          },
        })
        await tx.externalSource.create({
          data: {
            discoveryNodeId: n.id,
            platform: n.platform!,
            externalId: n.externalId!,
            sourceUrl: n.sourceUrl!,
            sourceTitle: n.title,
            sourceAuthors: n.authors ?? [],
            sourceHost: n.sourceHost!,
            publishedAt: Number.isNaN(publishedAt?.getTime()) ? null : publishedAt,
            credibilityTier: tier,
            // Sanitize on THIS write path too — the resolve route sanitizes, but the
            // tree POST is independently reachable, so a crafted abstract must be
            // scrubbed here before it's stored + rendered via dangerouslySetInnerHTML.
            abstract: n.abstract ? sanitizeAbstract(n.abstract) : null,
          },
        })
      })
    } catch (err) {
      // A concurrent insert can still trip the unique constraint — treat as dedup.
      console.error('[discovery/tree] source node create skipped:', err)
    }
  }

  if (kpAwarded > 0) {
    logActivity(ctx.teamId, ctx.dbUserId, 'discovery_kp_awarded', {
      kp: kpAwarded,
      nodeCount: plain.length,
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
