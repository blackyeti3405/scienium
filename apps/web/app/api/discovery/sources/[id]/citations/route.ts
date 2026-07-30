import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import {
  resolveArxivWork,
  resolvePubmedWork,
  resolveOpenalexWork,
  getReferences,
  getCitedBy,
  searchWorks,
  type OpenAlexNeighbour,
  type NormalizedWork,
} from '@/lib/discovery/openalex'
import { getTldr, getInfluentialCitingIds, type S2Tldr } from '@/lib/discovery/semanticscholar'
import { chipId, type SourceChip, type SourceLanes } from '@/lib/discovery/sources'

// ── GET /api/discovery/sources/[id]/citations ─────────────────────────────────
// Powers the reader's four surf lanes for one OPEN source node. Read-tier +
// TEAM-SCOPED (IDOR-safe): the node must belong to the caller's team.
//
// Cites / Cited by are FACTUAL citation edges. "More by author" / "More in topic"
// are the always-populated RELATED-PAPERS fallback (OpenAlex keyword search — a
// metadata search, NOT AI ranking) so the surf is never a dead end even when a
// paper has zero recorded citations. Thin lanes degrade to [] and NEVER 500.

const LANE_BUDGET = 6

function arxivNeighbourToChip(n: OpenAlexNeighbour): SourceChip | null {
  // Only arXiv-locatable neighbours are branchable (we can resolve them by id).
  if (!n.arxivId) return null
  const externalId = `arxiv:${n.arxivId}`
  return {
    laneId: chipId('arxiv', externalId),
    platform: 'arxiv',
    externalId,
    title: n.title ?? n.arxivId,
    subtitle: [n.authors[0], n.publicationYear].filter(Boolean).join(' · ') || undefined,
  }
}

function pubmedNeighbourToChip(n: OpenAlexNeighbour): SourceChip | null {
  // Only pmid-locatable neighbours are branchable (we can resolve them by id).
  if (!n.pmid) return null
  const externalId = `pmid:${n.pmid}`
  return {
    laneId: chipId('pubmed', externalId),
    platform: 'pubmed',
    externalId,
    title: n.title ?? n.pmid,
    subtitle: [n.authors[0], n.publicationYear].filter(Boolean).join(' · ') || undefined,
  }
}

/**
 * Universal chip mapper: try the OPEN NODE's own platform scheme first (an
 * arXiv paper's lanes keep arxiv: chips, a PubMed paper's keep pmid: — the
 * long-standing behavior), then the other native scheme, then fall back to the
 * neighbour's own OpenAlex id — so EVERY neighbour is branchable and citation
 * lanes no longer silently drop works that live outside arXiv/PubMed
 * (OA journals, bioRxiv-style preprints).
 */
function neighbourToChip(
  n: OpenAlexNeighbour,
  prefer: 'arxiv' | 'pubmed' | 'openalex',
): SourceChip | null {
  const native =
    prefer === 'pubmed'
      ? (pubmedNeighbourToChip(n) ?? arxivNeighbourToChip(n))
      : (arxivNeighbourToChip(n) ?? pubmedNeighbourToChip(n))
  if (native) return native
  const oaId = n.openAlexId.match(/(W\d+)\s*$/)?.[1]
  if (!oaId) return null
  const externalId = `openalex:${oaId}`
  return {
    laneId: chipId('openalex', externalId),
    platform: 'openalex',
    externalId,
    title: n.title ?? oaId,
    subtitle: [n.authors[0], n.publicationYear].filter(Boolean).join(' · ') || undefined,
  }
}

/**
 * Stable partition: chips whose externalId is in `influential` come first, all
 * others after — each partition keeping its original relative order. Used to
 * surface Semantic Scholar's influential citations at the top of Cited by without
 * otherwise reshuffling the OpenAlex-ordered lane.
 */
function reorderByInfluence(citedBy: SourceChip[], influential: Set<string>): SourceChip[] {
  const lead: SourceChip[] = []
  const rest: SourceChip[] = []
  for (const chip of citedBy) {
    if (influential.has(chip.externalId)) lead.push(chip)
    else rest.push(chip)
  }
  return [...lead, ...rest]
}

function normalizedToChip(w: NormalizedWork): SourceChip {
  return {
    laneId: chipId(w.platform, w.externalId),
    platform: w.platform,
    externalId: w.externalId,
    title: w.title,
    subtitle: [w.authors[0], w.publishedAt].filter(Boolean).join(' · ') || undefined,
  }
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  // IDOR guard: node must be a `source` node owned by the caller's team.
  const node = await db.discoveryNode.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    include: { externalSource: true },
  })
  if (!node || node.sourceType !== 'source' || !node.externalSource) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const src = node.externalSource
  const platform: 'arxiv' | 'pubmed' | 'openalex' =
    src.platform === 'pubmed' ? 'pubmed' : src.platform === 'openalex' ? 'openalex' : 'arxiv'
  const lanes: SourceLanes = { cites: [], citedBy: [], byAuthor: [], byCategory: [] }

  try {
    // ── Cites / Cited by — factual citation edges. Chips are mapped platform-
    // agnostically (native arxiv:/pmid: schemes first, openalex: fallback), so
    // no neighbour is dropped for living outside arXiv/PubMed. ──
    const oaWork =
      platform === 'arxiv'
        ? await resolveArxivWork(src.externalId.replace(/^arxiv:/i, ''))
        : platform === 'pubmed'
          ? await resolvePubmedWork(src.externalId.replace(/^pmid:/i, ''))
          : await resolveOpenalexWork(src.externalId)
    if (oaWork) {
      const [refs, citedBy] = await Promise.all([
        getReferences(oaWork, LANE_BUDGET),
        getCitedBy(oaWork, LANE_BUDGET),
      ])
      lanes.cites = refs.map((n) => neighbourToChip(n, platform)).filter((c): c is SourceChip => !!c)
      lanes.citedBy = citedBy
        .map((n) => neighbourToChip(n, platform))
        .filter((c): c is SourceChip => !!c)
    }

    // ── Related papers (always-populated fallback) — "More by author" + "More in
    //    topic" via OpenAlex keyword search. Guarantees the surf is never a dead end
    //    even when a paper has zero citation edges. Factual metadata search, not AI.
    const firstAuthor = src.sourceAuthors[0]
    const topicTerms = src.sourceTitle.split(/\s+/).filter(Boolean).slice(0, 8).join(' ')
    // Related lanes for an openalex node use the OA sweep (its own "platform").
    const searchPlatform = platform === 'openalex' ? ('oa' as const) : platform
    const [byAuthor, byTopic] = await Promise.all([
      firstAuthor
        ? searchWorks({ query: firstAuthor, platform: searchPlatform, limit: LANE_BUDGET + 1 })
        : Promise.resolve<NormalizedWork[]>([]),
      topicTerms
        ? searchWorks({ query: topicTerms, platform: searchPlatform, limit: LANE_BUDGET + 1 })
        : Promise.resolve<NormalizedWork[]>([]),
    ])
    lanes.byAuthor = byAuthor
      .filter((w) => w.externalId !== src.externalId)
      .slice(0, LANE_BUDGET)
      .map(normalizedToChip)
    lanes.byCategory = byTopic
      .filter((w) => w.externalId !== src.externalId)
      .slice(0, LANE_BUDGET)
      .map(normalizedToChip)
  } catch (err) {
    // A lane failure must never 500 the whole request — return whatever we have.
    console.error('[discovery/sources/citations] partial failure:', err)
  }

  // ── Semantic Scholar enrichment — independent of the lane try/catch above, so
  // an S2 outage never affects (or is affected by) the OpenAlex/NCBI lanes. Both
  // helpers self-degrade (null / empty Set) and never throw.
  // `sourceUrl` lets openalex-platform nodes enrich via their DOI (S2 has no
  // native OpenAlex-id lookup); arxiv/pmid nodes ignore it.
  const [tldr, influentialIds] = await Promise.all([
    getTldr(src.externalId, src.sourceUrl),
    getInfluentialCitingIds(src.externalId, src.sourceUrl),
  ])
  lanes.citedBy = reorderByInfluence(lanes.citedBy, influentialIds)

  return NextResponse.json<{ lanes: SourceLanes; tldr: S2Tldr | null }>({ lanes, tldr })
}
