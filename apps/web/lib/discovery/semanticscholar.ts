import 'server-only'
import { LruCache } from '@/lib/lru'
import { normalizeArxivId } from '@/lib/discovery/arxiv'
import { serverEnv } from '@/lib/env'

// ── Semantic Scholar (TL;DR + influential-citation ordering) ──────────────────
//
// Keyless, shared public pool → we cache HARD and degrade to nothing rather than
// retry/backoff (a stalled/throttled S2 call must never stall the reader). NO LLM
// call on OUR side: the TL;DR is Semantic Scholar's OWN extractive-summary model
// output, surfaced here as attributed third-party data — same "factual metadata,
// not AI ranking" posture as the OpenAlex/NCBI citation-graph adapters.
//
// Call budget: ≤2 S2 GETs per open source node on a cache miss (1 `tldr` fetch +
// 1 `citations` fetch), 0 on a cache hit, 0 for non-source nodes. The influential-
// citation ordering uses ONE `/paper/{id}/citations` call (option i) rather than
// up to LANE_BUDGET per-neighbour `influentialCitationCount` calls (option ii) —
// option (i) is chosen as the lowest-cost path.

const S2_API = 'https://api.semanticscholar.org/graph/v1'
// Optional free Semantic Scholar API key. Set S2_API_KEY in .env.local to raise
// the anonymous shared-pool rate limit; sent as the `x-api-key` header.
const API_KEY = serverEnv.S2_API_KEY()
const UA = 'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'

const CACHE_TTL_MS = 1000 * 60 * 60 // 60 minutes — mirrors ncbi.ts's hard cache
const CACHE_MAX_ENTRIES = 500

const FETCH_TIMEOUT_MS = 8000

export interface S2Tldr {
  text: string
}

const tldrCache = new LruCache<S2Tldr | null>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
// Stores the influential citing ids as a plain array; callers build a Set.
const influentialCache = new LruCache<string[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)

// ── TEST-ONLY mock seam (E2E) ──────────────────────────────────────────────────
// See lib/discovery/arxiv.ts for the full rationale. E2E_MOCK_SOURCES=1 is set
// ONLY in apps/web/.env.local for the Playwright webServer — never in
// production/staging. Seeded to the SAME seed fixtures as openalex.ts/ncbi.ts
// (arxiv:2401.00001, pmid:99900001) so the sibling citations E2E spec stays
// hermetic. The influential set marks the SECOND cited-by fixture
// (arxiv:2402.00022 / pmid:99900003) so the reorder is deterministically
// observable: it visibly jumps ahead of the first cited-by chip.
const MOCK = process.env.E2E_MOCK_SOURCES === '1'

const MOCK_TLDR: S2Tldr = {
  text: "Deterministic S2 TL;DR fixture standing in for Semantic Scholar's extractive summary.",
}

/**
 * Map our `arxiv:<id>` / `pmid:<id>` externalId scheme → the id prefix Semantic
 * Scholar resolves papers by keylessly. Null for anything else (nothing to look up).
 */
function s2IdFor(externalId: string): string | null {
  if (externalId.startsWith('arxiv:')) {
    const bare = externalId.slice('arxiv:'.length)
    return `ARXIV:${normalizeArxivId(bare)}`
  }
  if (externalId.startsWith('pmid:')) {
    const bare = externalId.slice('pmid:'.length)
    return `PMID:${bare}`
  }
  return null
}

/**
 * Single-attempt fetch — NO retry/backoff (respect the throttled shared pool; the
 * reader must not stall waiting on S2). Any throw or non-ok response (including a
 * 429 from the keyless pool) degrades to null.
 */
async function s2Fetch(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    return res
  } catch (err) {
    console.error('[discovery/semanticscholar] fetch failed:', err)
    return null
  }
}

/** Semantic Scholar's own extractive TL;DR for one paper. Null when unavailable. */
export async function getTldr(externalId: string): Promise<S2Tldr | null> {
  if (MOCK) {
    return externalId === 'arxiv:2401.00001' || externalId === 'pmid:99900001' ? MOCK_TLDR : null
  }
  const id = s2IdFor(externalId)
  if (!id) return null
  const cached = tldrCache.get(id)
  if (cached !== undefined) return cached

  const res = await s2Fetch(`${S2_API}/paper/${encodeURIComponent(id)}?fields=tldr`)
  if (!res) {
    tldrCache.set(id, null)
    return null
  }

  try {
    const data = (await res.json()) as { tldr?: { text?: string } | null }
    const text = data.tldr?.text?.replace(/\s+/g, ' ').trim() ?? ''
    const result: S2Tldr | null = text ? { text } : null
    tldrCache.set(id, result)
    return result
  } catch (err) {
    console.error('[discovery/semanticscholar] getTldr parse failed:', err)
    tldrCache.set(id, null)
    return null
  }
}

/**
 * Ids (in OUR `arxiv:`/`pmid:` scheme) of citing papers Semantic Scholar marks
 * `isInfluential`. Option (i): ONE `/paper/{id}/citations` call, not one per
 * neighbour. Empty set on any failure/miss — never throws.
 */
export async function getInfluentialCitingIds(externalId: string): Promise<Set<string>> {
  if (MOCK) {
    if (externalId === 'arxiv:2401.00001') return new Set(['arxiv:2402.00022'])
    if (externalId === 'pmid:99900001') return new Set(['pmid:99900003'])
    return new Set()
  }
  const id = s2IdFor(externalId)
  if (!id) return new Set()
  const cached = influentialCache.get(id)
  if (cached !== undefined) return new Set(cached)

  const url = `${S2_API}/paper/${encodeURIComponent(id)}/citations?fields=externalIds,isInfluential&limit=1000`
  const res = await s2Fetch(url)
  if (!res) {
    influentialCache.set(id, [])
    return new Set()
  }

  try {
    const data = (await res.json()) as {
      data?: Array<{
        isInfluential?: boolean
        citingPaper?: { externalIds?: { ArXiv?: string; PubMed?: string } }
      }>
    }
    const ids: string[] = []
    for (const entry of data.data ?? []) {
      if (!entry.isInfluential) continue
      const ext = entry.citingPaper?.externalIds
      if (ext?.ArXiv) ids.push(`arxiv:${normalizeArxivId(ext.ArXiv)}`)
      if (ext?.PubMed) ids.push(`pmid:${ext.PubMed}`)
    }
    influentialCache.set(id, ids)
    return new Set(ids)
  } catch (err) {
    console.error('[discovery/semanticscholar] getInfluentialCitingIds parse failed:', err)
    return new Set()
  }
}
