import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import type { ArticleSearchResult, SourceSearchResult } from '@/lib/discovery/sources'

// ── Discovery feature client (REFACTOR2 P2-3) ─────────────────────────────────
// The browse/search networking for the Papers + Articles panes, moved out of
// the visual components: UI renders state and emits intent; this module owns
// the HTTP contract (runtime-decoded via the shared requestJson helper).
// Tree mutations (resolve + persist) stay in the store's path via
// lib/discovery/treeApi.ts.

const sourceSearchResultSchema = z.object({
  platform: z.enum(['arxiv', 'pubmed', 'openalex']),
  externalId: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  published: z.string().nullable(),
  host: z.string(),
  tier: z.enum(['peer_reviewed', 'preprint', 'open_access', 'reference']),
  isReview: z.boolean().optional(),
}) satisfies z.ZodType<SourceSearchResult>

const articleSearchResultSchema = z.object({
  feed: z.string(),
  externalId: z.string(),
  provider: z.enum(['the_conversation', 'journalism', 'explainer', 'patents']),
  renderMode: z.enum(['full', 'linkout']),
  sourceName: z.string(),
  title: z.string(),
  author: z.string().nullable(),
  url: z.string(),
  excerpt: z.string().nullable(),
  publishedAt: z.string().nullable(),
}) satisfies z.ZodType<ArticleSearchResult>

const articleFeedMetaSchema = z.object({
  id: z.string(),
  provider: z.enum(['the_conversation', 'journalism', 'explainer', 'patents']),
  renderMode: z.enum(['full', 'linkout']),
  sourceName: z.string(),
  label: z.string(),
})

export type ArticleFeedMeta = z.infer<typeof articleFeedMetaSchema>

/** Merged Papers search (arXiv + PubMed + open access in one list). */
export function searchSources(query: string): Promise<SourceSearchResult[]> {
  return requestJson(
    `/api/discovery/sources/search?q=${encodeURIComponent(query)}`,
    z.array(sourceSearchResultSchema),
  )
}

/**
 * Articles tab browse: no `feed` → feed-picker metadata only; with a feed, the
 * feed's cards (`q` keyword-filters RSS feeds and IS the live search term for
 * the search-driven MedlinePlus/patents lanes).
 */
export function browseArticles(
  feed?: string,
  query?: string,
): Promise<{ feeds: ArticleFeedMeta[]; results: ArticleSearchResult[] }> {
  const params = new URLSearchParams()
  if (feed) params.set('feed', feed)
  if (query?.trim()) params.set('q', query.trim())
  const qs = params.toString()
  return requestJson(
    `/api/discovery/articles/browse${qs ? `?${qs}` : ''}`,
    z.object({ feeds: z.array(articleFeedMetaSchema), results: z.array(articleSearchResultSchema) }),
  )
}
