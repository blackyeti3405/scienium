// Client-side persistence wrappers for the Discovery tree (called from the
// browser — do NOT add 'server-only'). The DB is the source of truth
// (team-scoped via the API). Mutations update local state optimistically and
// fire one of these calls; failures are logged but don't block the UI (the
// store's next hydrate reconciles).

import type { DiscoveryNode, DiscoverySource } from '@/stores/discoveryStore'
import type {
  ArticleProvider,
  ArticleRenderMode,
  ResolvedArticle,
  ResolvedSource,
  SourcePlatform,
} from '@/lib/discovery/sources'

export type NewNode = {
  id: string
  title: string
  parentId: string | null
  source?: DiscoverySource
  videoId?: string
  // ── forwarded to the tree POST for `source` nodes ──
  platform?: SourcePlatform | 'pmc'
  externalId?: string
  sourceUrl?: string
  sourceHost?: string
  authors?: string[]
  abstract?: string
  publishedAt?: string
  // ── forwarded to the tree POST for `article` nodes ──
  provider?: ArticleProvider
  renderMode?: ArticleRenderMode
  sourceName?: string
  articleUrl?: string
  excerpt?: string
  html?: string
  articleAuthor?: string
}

/** GET the persisted tree. Throws on a failed load so the store can flag
 *  `loadError` (a fetch failure must never masquerade as an empty tree). */
export async function fetchTree(): Promise<DiscoveryNode[]> {
  const res = await fetch('/api/discovery/tree')
  if (!res.ok) throw new Error(`load failed (${res.status})`)
  const data = await res.json()
  // Spread preserves every field the GET serializer surfaces, including the
  // source-node metadata (platform/tier/url/abstract/…). Missing one here
  // would silently corrupt source nodes (epic §"Client coupling" warning).
  return (Array.isArray(data.nodes) ? data.nodes : []).map((n: DiscoveryNode) => ({
    ...n,
    source: n.source ?? 'wikipedia',
  }))
}

/** POST new nodes and distinguish a real zero-KP award from a failed write. */
export async function persistCreate(nodes: NewNode[]): Promise<{ ok: boolean; kp: number }> {
  try {
    const res = await fetch('/api/discovery/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes }),
    })
    if (!res.ok) return { ok: false, kp: 0 }
    const data = await res.json().catch(() => ({}))
    return { ok: true, kp: typeof data.kpAwarded === 'number' ? data.kpAwarded : 0 }
  } catch (err) {
    console.error('[discovery] create failed:', err)
    return { ok: false, kp: 0 }
  }
}

export async function persistStar(id: string, starred: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/discovery/tree/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    })
    return res.ok
  } catch (err) {
    console.error('[discovery] star failed:', err)
    return false
  }
}

// #11: persist a node's interest tier. Log-and-swallow on failure — the next
// hydrate() reconciles with the DB-authoritative value, same as `persistStar`.
export async function persistInterest(
  id: string,
  level: 'high' | 'mid' | 'low' | null,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/discovery/tree/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interestLevel: level }),
    })
    return res.ok
  } catch (err) {
    console.error('[discovery] interest failed:', err)
    return false
  }
}

export async function persistDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/discovery/tree/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (err) {
    console.error('[discovery] delete failed:', err)
    return false
  }
}

export async function persistReset(): Promise<boolean> {
  try {
    const res = await fetch('/api/discovery/tree', { method: 'DELETE' })
    return res.ok
  } catch (err) {
    console.error('[discovery] reset failed:', err)
    return false
  }
}

/** Resolve a citation/search pick into a full source (server-authoritative
 *  host + credibility tier). Returns null on any failure — non-fatal, the
 *  student can retry. */
export async function resolveSource(
  platform: SourcePlatform,
  externalId: string,
): Promise<ResolvedSource | null> {
  try {
    const res = await fetch('/api/discovery/sources/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, externalId }),
    })
    if (!res.ok) return null
    return (await res.json()) as ResolvedSource
  } catch (err) {
    console.error('[discovery] resolve failed:', err)
    return null
  }
}

/** Resolve an article-feed pick into a fully-resolved article (server-authoritative
 *  sanitized HTML). Returns null on any failure — non-fatal, the student can retry. */
export async function resolveArticle(feed: string, externalId: string): Promise<ResolvedArticle | null> {
  try {
    const res = await fetch('/api/discovery/articles/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feed, externalId }),
    })
    if (!res.ok) return null
    return (await res.json()) as ResolvedArticle
  } catch (err) {
    console.error('[discovery] article resolve failed:', err)
    return null
  }
}

/** #13: promote a starred source node into a real Paper. The server is the
 *  sole authority (team-scoped, IDOR-safe, idempotent). */
export async function persistPromote(
  nodeId: string,
): Promise<{ ok: true; paperId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/discovery/source/${nodeId}/promote`, { method: 'POST' })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Already promoted (409) still carries a paperId — treat as success.
      if (res.status === 409 && d.paperId) return { ok: true, paperId: d.paperId }
      return {
        ok: false,
        error: typeof d.error === 'string' ? d.error : 'Could not promote this source.',
      }
    }
    return { ok: true, paperId: d.paperId }
  } catch (err) {
    console.error('[discovery] promote failed:', err)
    return { ok: false, error: 'Network error — please try again.' }
  }
}
