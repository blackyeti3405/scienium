import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import {
  resolveArxivWork,
  getReferences,
  getCitedBy,
  searchWorks,
  type OpenAlexNeighbour,
  type NormalizedWork,
} from '@/lib/discovery/openalex'
import { elinkRefs, elinkCitedIn, esummaryPubmed, type PubmedWork } from '@/lib/discovery/ncbi'
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

function pubmedWorkToChip(w: PubmedWork): SourceChip {
  return {
    laneId: chipId('pubmed', w.externalId),
    platform: 'pubmed',
    externalId: w.externalId,
    title: w.title,
    subtitle: [w.authors[0], w.publishedAt].filter(Boolean).join(' · ') || undefined,
  }
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

async function pmidsToChips(pmids: string[]): Promise<SourceChip[]> {
  const capped = pmids.slice(0, LANE_BUDGET)
  if (capped.length === 0) return []
  const works = await esummaryPubmed(capped)
  return works.map(pubmedWorkToChip)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
  const platform: 'arxiv' | 'pubmed' = src.platform === 'pubmed' ? 'pubmed' : 'arxiv'
  const lanes: SourceLanes = { cites: [], citedBy: [], byAuthor: [], byCategory: [] }

  try {
    // ── Cites / Cited by — factual citation edges. ──
    if (platform === 'arxiv') {
      const arxivId = src.externalId.replace(/^arxiv:/i, '')
      const oaWork = await resolveArxivWork(arxivId)
      if (oaWork) {
        const [refs, citedBy] = await Promise.all([
          getReferences(oaWork, LANE_BUDGET),
          getCitedBy(oaWork, LANE_BUDGET),
        ])
        lanes.cites = refs.map(arxivNeighbourToChip).filter((c): c is SourceChip => !!c)
        lanes.citedBy = citedBy.map(arxivNeighbourToChip).filter((c): c is SourceChip => !!c)
      }
    } else {
      const pmid = src.externalId.replace(/^pmid:/i, '')
      const [refPmids, citedPmids] = await Promise.all([elinkRefs(pmid), elinkCitedIn(pmid)])
      const [cites, citedBy] = await Promise.all([pmidsToChips(refPmids), pmidsToChips(citedPmids)])
      lanes.cites = cites
      lanes.citedBy = citedBy
    }

    // ── Related papers (always-populated fallback) — "More by author" + "More in
    //    topic" via OpenAlex keyword search. Guarantees the surf is never a dead end
    //    even when a paper has zero citation edges. Factual metadata search, not AI.
    const firstAuthor = src.sourceAuthors[0]
    const topicTerms = src.sourceTitle.split(/\s+/).filter(Boolean).slice(0, 8).join(' ')
    const [byAuthor, byTopic] = await Promise.all([
      firstAuthor
        ? searchWorks({ query: firstAuthor, platform, limit: LANE_BUDGET + 1 })
        : Promise.resolve<NormalizedWork[]>([]),
      topicTerms
        ? searchWorks({ query: topicTerms, platform, limit: LANE_BUDGET + 1 })
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

  return NextResponse.json({ lanes })
}
