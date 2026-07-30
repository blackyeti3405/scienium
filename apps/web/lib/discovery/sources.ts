import type { CredibilityTier } from '@prisma/client'

// Descriptive UA with contact, sent on every outbound discovery-provider fetch
// (same policy the Wikipedia proxy follows).
export const DISCOVERY_UA = 'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'

// ── Shared source-node contract (client + server agree on these shapes) ───────
// The Papers-tab search box, the four surf lanes, the resolve route, and the tree
// POST branch all speak these types so nodes never silently corrupt (epic:
// "change these in lockstep").

/**
 * The platforms a student can search/branch in Feature A. `openalex` is the
 * catch-all for open-access works with neither an arXiv id nor a PMID
 * (bioRxiv/medRxiv/PsyArXiv-style preprints, open-access journal articles),
 * keyed by their OpenAlex work id.
 */
export type SourcePlatform = 'arxiv' | 'pubmed' | 'openalex'

/** One search-result row (Papers search box). */
export interface SourceSearchResult {
  platform: SourcePlatform
  externalId: string
  title: string
  authors: string[]
  published: string | null
  host: string
  tier: CredibilityTier
  /** Review article (a survey of a field) — badged in the search list. */
  isReview?: boolean
}

/** A selectable citation/metadata chip in one of the four surf lanes. */
export interface SourceChip {
  /** Stable id for the max-2 pending mechanic: `${platform}:${externalId}`. */
  laneId: string
  platform: SourcePlatform
  externalId: string
  title: string
  /** Short secondary line (authors / year). */
  subtitle?: string
}

/** The four surf lanes off an open source node. */
export interface SourceLanes {
  cites: SourceChip[]
  citedBy: SourceChip[]
  byAuthor: SourceChip[]
  byCategory: SourceChip[]
}

/** A fully-resolved source (returned by the resolve route; persisted by tree POST). */
export interface ResolvedSource {
  platform: SourcePlatform
  externalId: string
  title: string
  authors: string[]
  host: string
  tier: CredibilityTier
  url: string
  abstract: string | null
  publishedAt: string | null
}

/** Build the stable chip id used by the client's max-2 pending selection. */
export function chipId(platform: SourcePlatform, externalId: string): string {
  return `${platform}:${externalId}`
}

// ── Article-node contract (The Conversation + science-journalism RSS) ─────────
// A parallel, isolated source type — client + server agree on these shapes the
// same way the arXiv/PubMed contract above does.

/** Which lane an article feed belongs to. */
/**
 * `explainer` = plain-language reference lanes (MedlinePlus health topics).
 * `patents` = the prior-art lane (link-out cards to Google Patents).
 */
export type ArticleProvider = 'the_conversation' | 'journalism' | 'explainer' | 'patents'

/** How the reader renders the body: verbatim full HTML, or a link-out card. */
export type ArticleRenderMode = 'full' | 'linkout'

/** One browse-card row (the Articles tab results list) — no full `html`. */
export interface ArticleSearchResult {
  feed: string
  externalId: string
  provider: ArticleProvider
  renderMode: ArticleRenderMode
  sourceName: string
  title: string
  author: string | null
  url: string
  excerpt: string | null
  publishedAt: string | null
}

/** A fully-resolved article (returned by the resolve route; persisted by tree POST). */
export interface ResolvedArticle {
  feed: string
  externalId: string
  provider: ArticleProvider
  renderMode: ArticleRenderMode
  sourceName: string
  title: string
  author: string | null
  url: string
  excerpt: string | null
  /** Full sanitized HTML — populated only when renderMode === 'full'. */
  html: string | null
  publishedAt: string | null
}
