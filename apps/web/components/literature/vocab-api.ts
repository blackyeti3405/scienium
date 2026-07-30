import { z } from 'zod'
import { requestJson } from '@/lib/api/client'

/**
 * Vocabulary Builder client API — zod response schemas + `requestJson`
 * wrappers, mirroring `components/literature/api.ts`. Runtime-validates
 * every server response so a shape drift fails loudly in dev instead of
 * silently rendering `undefined`.
 *
 * Reads and reviews are deterministic (see lib/literature/srs.ts). `build` is
 * the one paid route: it curates each paper with a single Anthropic call (see
 * lib/literature/vocab-curate.ts) and persists the result forever.
 */

export const vocabSourceSchema = z.enum([
  'research_glossary',
  'stats_guide',
  'methods_guide',
  'data_quality_guide',
  'paper_definition',
  'paper_context',
  'llm_definition',
])
export type VocabSourceView = z.infer<typeof vocabSourceSchema>

export const vocabCardSchema = z.object({
  id: z.string(),
  term: z.string(),
  aliases: z.array(z.string()),
  definition: z.string(),
  source: vocabSourceSchema,
  sourceEntryId: z.string().nullable(),
  quote: z.string().nullable(),
  box: z.number(),
  dueAt: z.coerce.string(),
  termKey: z.string(),
  paperId: z.string(),
  paperTitle: z.string(),
})
export type VocabCardView = z.infer<typeof vocabCardSchema>

const deckSchema = z.object({
  cards: z.array(vocabCardSchema),
  due: z.array(vocabCardSchema),
  counts: z.object({
    total: z.number(),
    dueToday: z.number(),
    byBox: z.record(z.string(), z.number()),
  }),
})
export type VocabDeckView = z.infer<typeof deckSchema>

const buildResultSchema = z.object({
  created: z.number(),
  skipped: z.number(),
  total: z.number(),
})

const reviewResultSchema = z.object({
  box: z.number(),
  dueAt: z.coerce.string(),
  kpEarned: z.number(),
  capReached: z.boolean(),
  remainingDue: z.number(),
})
export type VocabReviewResult = z.infer<typeof reviewResultSchema>

export function getDeck() {
  return requestJson('/api/literature/vocab/deck', deckSchema)
}

export function buildDeck(paperId?: string) {
  return requestJson('/api/literature/vocab/build', buildResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paperId ? { paperId } : {}),
  })
}

export function reviewCard(cardId: string, grade: 'again' | 'hard' | 'good' | 'easy') {
  return requestJson('/api/literature/vocab/review', reviewResultSchema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, grade }),
  })
}

export async function removeCard(cardId: string): Promise<void> {
  await requestJson(`/api/literature/vocab/cards/${cardId}`, z.object({ ok: z.literal(true) }), {
    method: 'DELETE',
  })
}
