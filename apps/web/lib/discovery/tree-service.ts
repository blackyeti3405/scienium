import 'server-only'
import sanitizeHtml from 'sanitize-html'
import { db } from '@/lib/db'
import { hostToTier } from '@/lib/discovery/credibility'
import { sanitizeAbstract, ARTICLE_SANITIZE_OPTS } from '@/lib/discovery/sanitize'
import { awardDiscoveryVisit } from '@/lib/discovery/awardVisit'
import { recordActivity } from '@/lib/activity/log'

/**
 * Discovery-tree service: the read (hydrate) and write (create) algorithms
 * behind /api/discovery/tree. The route keeps guard + parse + response
 * shaping; the tree logic lives here.
 */

/** One client-generated node from the tree POST body (validated by the route's TreeBody). */
export interface IncomingTreeNode {
  id: string
  title: string
  parentId: string | null
  source?: 'wikipedia' | 'youtube' | 'source' | 'article'
  videoId?: string
  // ── source-node fields (only read when source === 'source') ──
  platform?: 'arxiv' | 'pubmed' | 'pmc' | 'openalex'
  externalId?: string
  sourceUrl?: string
  sourceHost?: string
  authors?: string[]
  abstract?: string
  publishedAt?: string
  // ── article-node fields (only read when source === 'article') ──
  provider?: 'the_conversation' | 'journalism' | 'explainer' | 'patents'
  renderMode?: 'full' | 'linkout'
  sourceName?: string
  articleUrl?: string
  excerpt?: string
  html?: string
  articleAuthor?: string
}

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

/** A concurrent insert tripping @@unique([teamId, externalId]) — genuine dedup. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

/** A proposed batch that isn't a same-team forest. Mapped to 400 by the route. */
export class TreeGraphError extends Error {}

/** One POST may not propose more than this many nodes. */
const MAX_BATCH_NODES = 200
/** Longest parent chain a single batch may introduce. */
const MAX_BATCH_DEPTH = 50

/**
 * Reject anything that isn't a same-team acyclic forest, BEFORE any write
 * (REFACTOR2 P1-R10).
 *
 * The UI emits a tree, but the endpoint accepts a general graph: node ids and
 * `parentId`s are client-generated, and `DiscoveryNode`'s self-relation
 * references only `id` — not `(teamId, id)` — so PostgreSQL happily let a
 * team-A node point at a team-B parent. A single batch could also introduce a
 * self-edge or a two-node cycle, and `hydrateTree.depthOf` walked parent
 * pointers without a visited set, so one such write made the team's Discovery
 * GET loop until the request timed out: a persisted, team-level denial of
 * service written by any member.
 *
 * A parent must therefore be null, an existing node **of this team**, or another
 * node in the same batch, and the batch's own edges must not close a loop.
 */
export async function assertValidTreeGraph(
  teamId: string,
  nodes: IncomingTreeNode[],
): Promise<void> {
  if (nodes.length > MAX_BATCH_NODES) {
    throw new TreeGraphError(`A single request may add at most ${MAX_BATCH_NODES} nodes`)
  }

  const ids = nodes.map((n) => n.id)
  if (new Set(ids).size !== ids.length) {
    throw new TreeGraphError('Duplicate node ids in one request')
  }

  const batch = new Map(nodes.map((n) => [n.id, n]))
  const referenced = [...new Set([...ids, ...nodes.map((n) => n.parentId)])].filter(
    (id): id is string => !!id,
  )
  // Team-scoped, so a foreign-team id simply doesn't come back and is rejected
  // below — the same 'unknown parent' answer an invented id gets, which is also
  // the right thing to tell a caller probing for other teams' node ids.
  const owned = new Set(
    (
      await db.discoveryNode.findMany({
        where: { teamId, id: { in: referenced } },
        select: { id: true },
      })
    ).map((r) => r.id),
  )

  for (const n of nodes) {
    if (n.parentId === n.id) throw new TreeGraphError('A node cannot be its own parent')
    if (n.parentId && !owned.has(n.parentId) && !batch.has(n.parentId)) {
      throw new TreeGraphError('Unknown parent node')
    }
  }

  // Cycles can only be introduced by edges NEW in this batch: every already
  // persisted node keeps the parent it was stored with, and the stored forest is
  // acyclic by this same check. So walk each new node's chain through the batch
  // and stop as soon as it anchors on a persisted node or null.
  for (const n of nodes) {
    if (owned.has(n.id)) continue // already persisted — createMany/dedup skips it
    const seen = new Set<string>([n.id])
    let cur = n.parentId
    let depth = 0
    while (cur && batch.has(cur) && !owned.has(cur)) {
      if (seen.has(cur)) throw new TreeGraphError('That branch would loop back on itself')
      seen.add(cur)
      // ponytail: caps depth ADDED by one batch, not total depth from the root.
      // Total depth needs a recursive CTE; the hydration visited-guard already
      // contains the failure mode. Add the CTE if deep trees become real.
      if (++depth > MAX_BATCH_DEPTH) throw new TreeGraphError('That branch is too deep')
      cur = batch.get(cur)!.parentId
    }
  }
}

/**
 * Hard bound on nodes returned by one hydrate (PERF-10). The client store
 * hydrates the WHOLE tree in one shot (a real cursor would change its
 * semantics), so this is a generous cap far above any plausible team tree.
 * Ordered oldest-first: parents are always visited before their children, so a
 * truncated result is still a consistent tree (never an orphaned child).
 */
const MAX_TREE_NODES = 500

/**
 * Loads the team's discovery tree and maps it to the client-store node shape.
 * Derives `depth` (parent-chain length) and `explored` (has children) so the
 * client store gets the same shape it had in localStorage.
 */
export async function hydrateTree(teamId: string) {
  const rows = await db.discoveryNode.findMany({
    where: { teamId },
    orderBy: { visitedAt: 'asc' },
    take: MAX_TREE_NODES,
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
      // Left-join the article side-row (parallel to externalSource, above) so
      // article nodes hydrate without a second fetch.
      articleSource: {
        select: {
          provider: true,
          renderMode: true,
          sourceName: true,
          title: true,
          author: true,
          url: true,
          excerpt: true,
          html: true,
          publishedAt: true,
        },
      },
    },
  })

  const byId = new Map(rows.map((r) => [r.id, r]))
  const hasChildren = new Set(rows.map((r) => r.parentId).filter(Boolean) as string[])

  // The visited set is corruption CONTAINMENT, not the fix: `assertValidTreeGraph`
  // stops cycles at write time, but rows written before that guard existed (or by
  // a future bug) must not make this GET spin until the request times out.
  function depthOf(id: string): number {
    let d = 0
    const seen = new Set<string>([id])
    let cur = byId.get(id)
    while (cur?.parentId && !seen.has(cur.parentId)) {
      d += 1
      seen.add(cur.parentId)
      cur = byId.get(cur.parentId)
    }
    return d
  }

  return rows.map((r) => {
    const es = r.externalSource
    const as = r.articleSource
    return {
      id: r.id,
      title: es?.sourceTitle ?? as?.title ?? r.wikipediaTitle ?? r.youtubeTitle ?? '',
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
      // Source-node metadata (undefined for wiki/youtube/article rows).
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
      // Article-node metadata (undefined for every other row).
      provider: as?.provider ?? undefined,
      renderMode: as?.renderMode ?? undefined,
      sourceName: as?.sourceName ?? undefined,
      articleUrl: as?.url ?? undefined,
      excerpt: as?.excerpt ?? undefined,
      articleHtml: as?.html ?? undefined,
      articleAuthor: as?.author ?? undefined,
      articlePublishedAt: as?.publishedAt ? as.publishedAt.toISOString() : undefined,
    }
  })
}

/**
 * Creates one or more nodes (root or branch children) for the team.
 * Returns the KP credited on this request. Each node's KP mint and its
 * teacher-visible activity record commit in that node's own transaction
 * (REFACTOR2 P1-R5) — there is no per-request activity row to return here.
 */
export async function createTreeNodes({
  teamId,
  userId,
  nodes,
}: {
  teamId: string
  userId: string
  nodes: IncomingTreeNode[]
}): Promise<{ kpAwarded: number }> {
  // Prove the whole proposed graph is a same-team forest before ANY write.
  await assertValidTreeGraph(teamId, nodes)

  // wiki/youtube go through the bulk createMany path UNCHANGED. `source` and
  // `article` nodes each need an atomic node + side-row write, so they're
  // split out below.
  const plain = nodes.filter((n) => !['source', 'article'].includes(n.source ?? 'wikipedia'))
  const sources = nodes.filter((n) => n.source === 'source')
  const articles = nodes.filter((n) => n.source === 'article')

  // Running total of KP credited on this request (wiki/youtube first-visits).
  // `source` nodes award later, on reflection completion — never on create.
  let kpAwarded = 0

  if (plain.length > 0) {
    await db.discoveryNode.createMany({
      data: plain.map((n) => {
        const source = n.source ?? 'wikipedia'
        return {
          id: n.id,
          teamId,
          parentId: n.parentId,
          sourceType: source,
          wikipediaTitle: source === 'wikipedia' ? n.title : null,
          youtubeTitle: source === 'youtube' ? n.title : null,
          youtubeVideoId: source === 'youtube' ? n.videoId ?? null : null,
          visitedByUserId: userId,
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
        // Durable (REFACTOR2 P1-R5): the KP mint and its teacher-visible
        // record commit together, in this node's own transaction — the same
        // isolation the visit award already relies on (one capped/dup node
        // can't roll back another's credit).
        const { kpAwarded: got } = await db.$transaction(async (tx) => {
          const res = await awardDiscoveryVisit(tx, { teamId, userId, nodeId: n.id, tier: null })
          if (res.kpAwarded > 0) {
            await recordActivity(tx, teamId, userId, 'discovery_kp_awarded', {
              kp: res.kpAwarded,
              nodeCount: 1,
            })
          }
          return res
        })
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
      where: { teamId, externalId: n.externalId },
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
            teamId,
            parentId: n.parentId,
            sourceType: 'source',
            externalId: n.externalId,
            visitedByUserId: userId,
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
      // ONLY a real unique-constraint violation is dedup. The old broad catch
      // logged every failure and still returned `{ ok: true }`, so a genuine
      // write error looked like a successful save (REFACTOR2 P1-R10).
      if (!isUniqueViolation(err)) throw err
    }
  }

  // ── Article-node branch (atomic node + articleSource side-row) ─────────────
  // Mirrors the source branch above (atomic transaction, dedup on
  // @@unique([teamId, externalId])), except articles award first-visit KP at
  // CREATE time (tier: null, ×1) like wiki/youtube reading units — an article
  // is a reading unit, not a citable source held for later reflection.
  for (const n of articles) {
    // Guard required fields (zod makes them optional since they're article-only).
    if (!n.externalId || !n.provider || !n.renderMode || !n.sourceName || !n.articleUrl) continue
    // articleUrl is rendered as an href — drop non-http(s) schemes (XSS defense).
    if (!isHttpUrl(n.articleUrl)) continue

    const existing = await db.discoveryNode.findFirst({
      where: { teamId, externalId: n.externalId },
      select: { id: true },
    })
    if (existing) continue // dedup: skip, client already knows the existing node

    const publishedAt = n.publishedAt ? new Date(n.publishedAt) : null

    try {
      const { kpAwarded: got } = await db.$transaction(async (tx) => {
        await tx.discoveryNode.create({
          data: {
            id: n.id,
            teamId,
            parentId: n.parentId,
            sourceType: 'article',
            externalId: n.externalId,
            visitedByUserId: userId,
          },
        })
        await tx.articleSource.create({
          data: {
            discoveryNodeId: n.id,
            provider: n.provider!,
            renderMode: n.renderMode!,
            sourceName: n.sourceName!,
            title: n.title,
            author: n.articleAuthor ?? null,
            url: n.articleUrl!,
            excerpt: n.excerpt ?? null,
            // Re-sanitize on THIS write path too — the resolve route sanitizes, but
            // the tree POST is independently reachable, so crafted HTML must be
            // scrubbed here before it's stored + rendered via dangerouslySetInnerHTML
            // (same defense as `abstract`, above).
            html: n.html ? sanitizeHtml(n.html, ARTICLE_SANITIZE_OPTS) : null,
            publishedAt: Number.isNaN(publishedAt?.getTime()) ? null : publishedAt,
          },
        })
        const res = await awardDiscoveryVisit(tx, { teamId, userId, nodeId: n.id, tier: null })
        // Durable (REFACTOR2 P1-R5): same-transaction record as the plain-node
        // branch above.
        if (res.kpAwarded > 0) {
          await recordActivity(tx, teamId, userId, 'discovery_kp_awarded', {
            kp: res.kpAwarded,
            nodeCount: 1,
          })
        }
        return res
      })
      kpAwarded += got
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
    }
  }

  return { kpAwarded }
}
