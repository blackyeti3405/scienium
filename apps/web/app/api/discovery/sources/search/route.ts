import { NextRequest, NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/route-context'
import { searchWorks } from '@/lib/discovery/openalex'
import { db } from '@/lib/db'
import type { SourceSearchResult } from '@/lib/discovery/sources'

type Work = Awaited<ReturnType<typeof searchWorks>>[number]

/** Alternate rows from two relevance-sorted lists (a first) until both drain. */
function interleave(a: Work[], b: Work[]): Work[] {
  const out: Work[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]!)
    if (b[i]) out.push(b[i]!)
  }
  return out
}

// ── GET /api/discovery/sources/search ─────────────────────────────────────────
// Papers-tab search box. Keyword search via OpenAlex (Phase A) — ONE fast, keyless
// JSON API that indexes BOTH arXiv preprints and PubMed papers. arXiv's Atom API /
// NCBI are no longer in this path (they 429 datacenter IPs and stall). Read-tier
// proxy over public metadata (no team DB touched) — auth() + rate-limit is
// sufficient.
//
// Default (no `platform` param, or `platform=all`): a MERGED result set — both
// platform searches run concurrently, a work present in both (an arXiv preprint
// that was later published) keeps only its peer-reviewed PubMed row, and the two
// relevance-sorted lists are interleaved. Preprint vs peer-reviewed shows per row
// via `tier`; the client's preprint toggle filters on it. `platform=arxiv|pubmed`
// is still honored for callers that want one platform.
//
// Phase B: every result is upserted into the shared `external_works` cache so
// OPENING a paper (resolve) and re-searching are instant DB reads, and the app
// stays resilient when OpenAlex has a blip. Still keyword-relevance only — NO LLM.
export async function GET(req: NextRequest) {
  const { error } = await requireUserContext(req, { tier: 'read' })
  if (error) return error

  const params = req.nextUrl.searchParams
  const q = (params.get('q') ?? '').trim()
  const platformParam = params.get('platform')
  const platform =
    platformParam === 'pubmed' ? 'pubmed' : platformParam === 'arxiv' ? 'arxiv' : 'all'

  if (q.length < 2) return NextResponse.json([])

  try {
    const t0 = Date.now()
    console.log(`[sources/search] q="${q}" platform=${platform} → calling OpenAlex…`)
    let works: Work[]
    if (platform === 'all') {
      // Three concurrent sweeps: PubMed (peer-reviewed anchor), arXiv, and the
      // open-access catch-all (bioRxiv/medRxiv/PsyArXiv preprints + OA journal
      // articles). Dedupe on the OpenAlex id with PubMed > arXiv > OA priority
      // (the published version of a work wins over its preprint), then
      // interleave peer-reviewed-first, and float review articles to the top —
      // a survey of the field is the best first click for a novice.
      const [arxiv, pubmed, oa] = await Promise.all([
        searchWorks({ query: q, platform: 'arxiv', limit: 12 }),
        searchWorks({ query: q, platform: 'pubmed', limit: 12 }),
        searchWorks({ query: q, platform: 'oa', limit: 12 }),
      ])
      const seen = new Set(pubmed.map((w) => w.openAlexId).filter(Boolean))
      const arxivOnly = arxiv.filter((w) => !w.openAlexId || !seen.has(w.openAlexId))
      for (const w of arxivOnly) if (w.openAlexId) seen.add(w.openAlexId)
      const oaOnly = oa.filter(
        (w) => (!w.openAlexId || !seen.has(w.openAlexId)) && w.platform === 'openalex',
      )
      const merged = interleave(pubmed, interleave(oaOnly, arxivOnly)).slice(0, 20)
      // Stable partition: reviews lead, everything else keeps its order.
      works = [...merged.filter((w) => w.isReview), ...merged.filter((w) => !w.isReview)]
    } else {
      works = await searchWorks({ query: q, platform, limit: 12 })
    }
    console.log(`[sources/search] OpenAlex returned ${works.length} works in ${Date.now() - t0}ms`)

    // Phase B cache: insert new works (skipDuplicates → one round-trip, no churn on
    // works we already have). Metadata is effectively static, so we don't update.
    if (works.length > 0) {
      await db.externalWork.createMany({
        data: works.map((w) => ({
          externalId: w.externalId,
          platform: w.platform,
          title: w.title,
          authors: w.authors,
          abstract: w.abstract,
          host: w.host,
          tier: w.tier,
          publishedAt: w.publishedAt,
          arxivId: w.arxivId,
          pmid: w.pmid,
          doi: w.doi,
          openAlexId: w.openAlexId,
        })),
        skipDuplicates: true,
      })
    }

    const results: SourceSearchResult[] = works.map((w) => ({
      platform: w.platform,
      externalId: w.externalId,
      title: w.title,
      authors: w.authors,
      published: w.publishedAt,
      host: w.host,
      tier: w.tier,
      ...(w.isReview ? { isReview: true } : {}),
    }))
    return NextResponse.json(results)
  } catch (err) {
    console.error('[discovery/sources/search] failed:', err)
    // Never blow up the search box — degrade to empty.
    return NextResponse.json([])
  }
}
