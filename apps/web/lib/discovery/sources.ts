import type { CredibilityTier } from '@prisma/client'

// ── Shared source-node contract (client + server agree on these shapes) ───────
// The Papers-tab search box, the four surf lanes, the resolve route, and the tree
// POST branch all speak these types so nodes never silently corrupt (epic:
// "change these in lockstep").

/** The two platforms a student can search/branch in Feature A. */
export type SourcePlatform = 'arxiv' | 'pubmed'

/** One search-result row (Papers search box). */
export interface SourceSearchResult {
  platform: SourcePlatform
  externalId: string
  title: string
  authors: string[]
  published: string | null
  host: string
  tier: CredibilityTier
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
