import type { NormalizedWork, OpenAlexNeighbour, OpenAlexWork } from './openalex'

// ── TEST-ONLY OpenAlex fixtures (E2E) ─────────────────────────────────────────
// Extracted from openalex.ts (REFACTOR2 P2-4: the provider adapter should hold
// provider behavior, not ~200 lines of test data). Consumed ONLY behind the
// E2E_MOCK_SOURCES=1 seam — see the MOCK flag in openalex.ts and the rationale
// in lib/discovery/arxiv.ts. All values must stay in lockstep with
// apps/web/e2e/papers-tab.spec.ts.

export const MOCK_REFERENCES: OpenAlexNeighbour[] = [
  {
    openAlexId: 'https://openalex.org/W-e2e-ref-1',
    title: 'E2E Fixture: A Reference This Paper Cites',
    publicationYear: 2020,
    arxivId: '2001.00011',
    pmid: '99900002',
    authors: ['Ref One Author'],
  },
  {
    openAlexId: 'https://openalex.org/W-e2e-ref-2',
    title: 'E2E Fixture: A Second Reference This Paper Cites',
    publicationYear: 2021,
    arxivId: '2101.00012',
    pmid: '90000012',
    authors: ['Ref Two Author'],
  },
]

export const MOCK_CITED_BY: OpenAlexNeighbour[] = [
  {
    openAlexId: 'https://openalex.org/W-e2e-citedby-1',
    title: 'E2E Fixture: A Paper That Cites This One',
    publicationYear: 2024,
    arxivId: '2402.00021',
    pmid: '99900003',
    authors: ['CitedBy One Author'],
  },
  {
    openAlexId: 'https://openalex.org/W-e2e-citedby-2',
    title: 'E2E Fixture: A Second Paper That Cites This One',
    publicationYear: 2024,
    arxivId: '2402.00022',
    pmid: '90000022',
    authors: ['CitedBy Two Author'],
  },
]

export const MOCK_WORK: OpenAlexWork = {
  id: 'https://openalex.org/W-e2e-seed',
  title: 'E2E Fixture: Attention Mechanisms for Deterministic Testing',
  publicationYear: 2024,
  arxivId: '2401.00001',
  doi: '10.48550/arxiv.2401.00001',
  authors: ['Ada Fixture', 'Grace Mocker'],
  referencedWorks: MOCK_REFERENCES.map((r) => r.openAlexId),
  citedByApiUrl: 'https://api.openalex.org/works?filter=cites:W-e2e-seed',
  citedByCount: MOCK_CITED_BY.length,
}

// Mirrors MOCK_WORK but keyed to the ncbi.ts MOCK_SEED_PMID ('99900001') so the
// pubmed citations branch (resolvePubmedWork) has a deterministic seed too. The
// MOCK getReferences/getCitedBy branches below return the mock arrays regardless
// of work contents — referencedWorks/citedByApiUrl/citedByCount just need to be
// non-empty/non-zero so the route's `if (oaWork)` gate fires.
export const MOCK_PUBMED_WORK: OpenAlexWork = {
  id: 'https://openalex.org/W-e2e-pubmed-seed',
  title: 'E2E Fixture: A Deterministic PubMed Paper for Testing',
  publicationYear: 2024,
  arxivId: null,
  doi: null,
  authors: ['Beatrix Fixture', 'Carl Mocker'],
  referencedWorks: MOCK_REFERENCES.map((r) => r.openAlexId),
  citedByApiUrl: 'https://api.openalex.org/works?filter=cites:W-e2e-pubmed-seed',
  citedByCount: MOCK_CITED_BY.length,
}

// ── TEST-ONLY search fixtures (E2E) ─────────────────────────────────────────────
// The Papers search box (GET /api/discovery/sources/search) hits OpenAlex live,
// so under E2E it returned non-deterministic rows and flaked the platform/tier
// assertion. These fixtures make the whole Papers loop hermetic, keyed to the
// SAME seed queries ('attention' / 'fixture') and resolve-seed externalIds
// (arxiv:2401.00001 / pmid:99900001) the papers-tab spec asserts on. The seed
// query returns the seed work first (so opening result[0] resolves into the
// getWorkByExternalId seed below); any OTHER query returns a small deterministic
// RELATED list so the citations route's byAuthor/byCategory fallback lanes are
// never empty. All values must match apps/web/e2e/papers-tab.spec.ts.
export const MOCK_SEARCH_ARXIV_QUERY = 'attention'
export const MOCK_SEARCH_PUBMED_QUERY = 'fixture'

export const MOCK_ARXIV_SEED: NormalizedWork = {
  platform: 'arxiv',
  externalId: 'arxiv:2401.00001',
  title: 'E2E Fixture: Attention Mechanisms for Deterministic Testing',
  authors: ['Ada Fixture', 'Grace Mocker'],
  abstract: 'This is a deterministic E2E fixture abstract standing in for a real arXiv paper.',
  publishedAt: '2024-01-01',
  host: 'arxiv.org',
  tier: 'preprint',
  arxivId: '2401.00001',
  pmid: null,
  doi: '10.48550/arxiv.2401.00001',
  openAlexId: 'https://openalex.org/W-e2e-seed',
}

export const MOCK_PUBMED_SEED: NormalizedWork = {
  platform: 'pubmed',
  externalId: 'pmid:99900001',
  title: 'E2E Fixture: A Deterministic PubMed Paper for Testing',
  authors: ['Beatrix Fixture', 'Carl Mocker'],
  abstract: 'This is a deterministic E2E fixture abstract standing in for a real PubMed paper.',
  publishedAt: '2024',
  host: 'pubmed.ncbi.nlm.nih.gov',
  tier: 'peer_reviewed',
  arxivId: null,
  pmid: '99900001',
  doi: null,
  openAlexId: 'https://openalex.org/W-e2e-pubmed-seed',
}

// Distinct non-seed works — the 2nd arXiv search result AND the always-populated
// byAuthor/byCategory fallback lanes (their externalIds differ from the open
// source's, so they survive the citations route's self-filter).
export const MOCK_ARXIV_RELATED: NormalizedWork[] = [
  {
    platform: 'arxiv', externalId: 'arxiv:2402.00021',
    title: 'E2E Fixture: A Related arXiv Paper', authors: ['Related Arxiv Author'],
    abstract: null, publishedAt: '2024', host: 'arxiv.org', tier: 'preprint',
    arxivId: '2402.00021', pmid: null, doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-a1',
  },
  {
    platform: 'arxiv', externalId: 'arxiv:2402.00022',
    title: 'E2E Fixture: Another Related arXiv Paper', authors: ['Related Arxiv Author Two'],
    abstract: null, publishedAt: '2024', host: 'arxiv.org', tier: 'preprint',
    arxivId: '2402.00022', pmid: null, doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-a2',
  },
]

export const MOCK_PUBMED_RELATED: NormalizedWork[] = [
  {
    platform: 'pubmed', externalId: 'pmid:90000022',
    title: 'E2E Fixture: A Related PubMed Paper', authors: ['Related Pubmed Author'],
    abstract: null, publishedAt: '2024', host: 'pubmed.ncbi.nlm.nih.gov', tier: 'peer_reviewed',
    arxivId: null, pmid: '90000022', doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-p1',
  },
  {
    platform: 'pubmed', externalId: 'pmid:99900003',
    title: 'E2E Fixture: Another Related PubMed Paper', authors: ['Related Pubmed Author Two'],
    abstract: null, publishedAt: '2024', host: 'pubmed.ncbi.nlm.nih.gov', tier: 'peer_reviewed',
    arxivId: null, pmid: '99900003', doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-p2',
  },
]

// The 'oa' sweep fixtures: one DOAJ-journal REVIEW article (openalex platform,
// peer_reviewed) and one repository preprint (openalex platform, preprint) — so
// the merged-search spec can assert the review badge and the openalex tiers.
export const MOCK_OA_RELATED: NormalizedWork[] = [
  {
    platform: 'openalex', externalId: 'openalex:W990000031',
    title: 'E2E Fixture: A Review of Attention Research', authors: ['Review Author'],
    abstract: null, publishedAt: '2023', host: 'journals.e2e-fixture.org', tier: 'peer_reviewed',
    isReview: true,
    arxivId: null, pmid: null, doi: 'https://doi.org/10.9999/e2e-review', openAlexId: 'https://openalex.org/W990000031',
  },
  {
    platform: 'openalex', externalId: 'openalex:W990000032',
    title: 'E2E Fixture: A bioRxiv-style Open Preprint', authors: ['Oa Preprint Author'],
    abstract: null, publishedAt: '2024', host: 'biorxiv.e2e-fixture.org', tier: 'preprint',
    arxivId: null, pmid: null, doi: null, openAlexId: 'https://openalex.org/W990000032',
  },
]

/** A citation-graph neighbour fixture → a resolvable arXiv NormalizedWork. */
function mockNeighbourToWork(n: OpenAlexNeighbour): NormalizedWork | null {
  if (!n.arxivId) return null
  return {
    platform: 'arxiv',
    externalId: `arxiv:${n.arxivId}`,
    title: n.title ?? n.arxivId,
    authors: n.authors,
    abstract: null,
    publishedAt: n.publicationYear ? String(n.publicationYear) : null,
    host: 'arxiv.org',
    tier: 'preprint',
    arxivId: n.arxivId,
    pmid: n.pmid ?? null,
    doi: null,
    openAlexId: n.openAlexId,
  }
}

// Every resolvable fixture work, keyed by externalId: the seeds, the search
// related works, and the cites/citedBy neighbours (so branching any chip — AC5 —
// resolves). Later entries win on a duplicate id, which is fine (same fixture).
export const MOCK_WORK_BY_EXTID = new Map<string, NormalizedWork>(
  [
    MOCK_ARXIV_SEED,
    MOCK_PUBMED_SEED,
    ...MOCK_ARXIV_RELATED,
    ...MOCK_PUBMED_RELATED,
    ...MOCK_OA_RELATED,
    ...[...MOCK_REFERENCES, ...MOCK_CITED_BY]
      .map(mockNeighbourToWork)
      .filter((w): w is NormalizedWork => w !== null),
  ].map((w) => [w.externalId, w]),
)
