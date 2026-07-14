import { NextRequest, NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/route-context'
import { searchWorks } from '@/lib/discovery/openalex'
import { db } from '@/lib/db'
import type { SourceSearchResult } from '@/lib/discovery/sources'

// ── GET /api/discovery/sources/search ─────────────────────────────────────────
// Papers-tab search box. Keyword search via OpenAlex (Phase A) — ONE fast, keyless
// JSON API that indexes BOTH arXiv preprints and PubMed papers, so the platform
// toggle is a filter, not a second flaky endpoint. arXiv's Atom API / NCBI are no
// longer in this path (they 429 datacenter IPs and stall). Read-tier proxy over
// public metadata (no team DB touched) — auth() + rate-limit is sufficient.
//
// Phase B: every result is upserted into the shared `external_works` cache so
// OPENING a paper (resolve) and re-searching are instant DB reads, and the app
// stays resilient when OpenAlex has a blip. Still keyword-relevance only — NO LLM.
export async function GET(req: NextRequest) {
  const { error } = await requireUserContext(req, { tier: 'read' })
  if (error) return error

  const params = req.nextUrl.searchParams
  const q = (params.get('q') ?? '').trim()
  const platform = params.get('platform') === 'pubmed' ? 'pubmed' : 'arxiv'

  if (q.length < 2) return NextResponse.json([])

  try {
    const t0 = Date.now()
    console.log(`[sources/search] q="${q}" platform=${platform} → calling OpenAlex…`)
    const works = await searchWorks({ query: q, platform, limit: 12 })
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
    }))
    return NextResponse.json(results)
  } catch (err) {
    console.error('[discovery/sources/search] failed:', err)
    // Never blow up the search box — degrade to empty.
    return NextResponse.json([])
  }
}
