import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { getWorkByExternalId, type NormalizedWork } from '@/lib/discovery/openalex'
import { normalizeArxivId } from '@/lib/discovery/arxiv'
import type { CredibilityTier } from '@prisma/client'
import type { ResolvedSource } from '@/lib/discovery/sources'

// ── POST /api/discovery/sources/resolve ───────────────────────────────────────
// Resolve a (platform, externalId) into a fully-resolved payload the client then
// persists via the tree POST branch. Mutate-tier.
//
// Phase B: read the shared `external_works` cache FIRST (the search box already
// stored it) → instant, no external call. On a miss (e.g. a citation chip the user
// never searched), fall back to OpenAlex — NOT arXiv/NCBI — so opening a paper can
// never hang on a 429/stall. SERVER is the sole authority on host/tier/abstract.
const ResolveBody = z
  .object({
    platform: z.enum(['arxiv', 'pubmed', 'openalex']),
    externalId: z.string().trim().min(1).max(64),
  })
  .strict()

type Platform = 'arxiv' | 'pubmed' | 'openalex'

function bareId(platform: Platform, externalId: string): string {
  if (platform === 'arxiv') return normalizeArxivId(externalId)
  if (platform === 'pubmed') return externalId.replace(/^pmid:/i, '').trim()
  return externalId.replace(/^openalex:/i, '').trim()
}

function urlFor(
  platform: Platform,
  arxivId: string | null,
  pmid: string | null,
  doi: string | null,
  openAlexId: string | null,
): string {
  if (platform === 'arxiv') return `https://arxiv.org/abs/${arxivId ?? ''}`
  if (platform === 'pubmed') return `https://pubmed.ncbi.nlm.nih.gov/${pmid ?? ''}/`
  // openalex works: the DOI resolves to the publisher/repository landing page;
  // the OpenAlex work page is the always-available fallback.
  if (doi) return doi.startsWith('http') ? doi : `https://doi.org/${doi}`
  const w = (openAlexId ?? '').match(/(W\d+)\s*$/)?.[1]
  return `https://openalex.org/${w ?? ''}`
}

function toResolved(w: {
  platform: Platform
  externalId: string
  title: string
  authors: string[]
  host: string
  tier: CredibilityTier
  abstract: string | null
  publishedAt: string | null
  arxivId: string | null
  pmid: string | null
  doi: string | null
  openAlexId: string | null
}): ResolvedSource {
  return {
    platform: w.platform,
    externalId: w.externalId,
    title: w.title,
    authors: w.authors,
    host: w.host,
    tier: w.tier,
    url: urlFor(w.platform, w.arxivId, w.pmid, w.doi, w.openAlexId),
    abstract: w.abstract || null,
    publishedAt: w.publishedAt,
  }
}

export async function POST(req: NextRequest) {
  const { error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, ResolveBody)
  if (error) return error
  const { platform } = data
  const bare = bareId(platform, data.externalId)
  const externalId =
    platform === 'arxiv' ? `arxiv:${bare}` : platform === 'pubmed' ? `pmid:${bare}` : `openalex:${bare}`

  try {
    // Cache-first (populated by the search box) — instant, no network.
    const cached = await db.externalWork.findUnique({ where: { externalId } })
    if (cached) {
      return NextResponse.json(
        toResolved({
          platform, // narrowed request value (row.platform is the wider enum)
          externalId: cached.externalId,
          title: cached.title,
          authors: cached.authors,
          host: cached.host,
          tier: cached.tier,
          abstract: cached.abstract,
          publishedAt: cached.publishedAt,
          arxivId: cached.arxivId,
          pmid: cached.pmid,
          doi: cached.doi,
          openAlexId: cached.openAlexId,
        }),
      )
    }

    // Miss → OpenAlex (never arXiv/NCBI), then cache for next time.
    const work: NormalizedWork | null = await getWorkByExternalId(platform, bare)
    if (!work) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }
    await db.externalWork.createMany({
      data: [
        {
          externalId: work.externalId,
          platform: work.platform,
          title: work.title,
          authors: work.authors,
          abstract: work.abstract,
          host: work.host,
          tier: work.tier,
          publishedAt: work.publishedAt,
          arxivId: work.arxivId,
          pmid: work.pmid,
          doi: work.doi,
          openAlexId: work.openAlexId,
        },
      ],
      skipDuplicates: true,
    })
    return NextResponse.json(toResolved(work))
  } catch (err) {
    console.error('[discovery/sources/resolve] failed:', err)
    return NextResponse.json({ error: 'Failed to resolve source' }, { status: 502 })
  }
}
