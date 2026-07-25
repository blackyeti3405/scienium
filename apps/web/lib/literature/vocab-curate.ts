import 'server-only'
import { z } from 'zod'
import { aiCreate } from '@/lib/ai/spend'
import { logEvent } from '@/lib/observability/log'
import { VOCAB_MAX_TERMS_PER_PAPER, type ExtractedTerm, type TermSource } from './vocab'

/**
 * Vocabulary Builder — the ONE curation step. `vocab.ts` mechanically extracts
 * up to 60 candidates; this picks the ~12 worth learning and writes a definition
 * for each that lacks a grounded one.
 *
 * Why an LLM is here at all, in a feature that was built to avoid one:
 *
 *  - **Selection.** Frequency cannot tell "series elastic actuator" from
 *    "foot". In a paper about ankle prostheses the most repeated words ARE
 *    "foot", "ankle", "walking" — the subject, which the reader already knows.
 *    Picking what is worth learning is a judgement about the reader, and no
 *    mechanical signal available here encodes it.
 *  - **Definitions.** The authored dictionary is ~70 general research/stats
 *    terms. It will never contain "shank frame" or "plantarflexion". Without a
 *    model those cards can only show a sentence and say "no definition
 *    available" — which is what students actually saw.
 *
 * COST: exactly one call per paper, at build time, persisted to `vocab_cards`
 * forever. Re-running the builder re-uses the stored rows (`skipDuplicates` on
 * `@@unique([userId, termKey])`), so a paper is never curated twice.
 *
 * Prompt caching is deliberately NOT used: Sonnet 5's minimum cacheable prefix
 * is 2048 tokens and this system prompt is a fraction of that, so a
 * `cache_control` marker would silently never cache while looking like an
 * optimization. The per-paper DB row is the cache that matters.
 *
 * Thinking is left ON (adaptive, medium effort) — unlike the other routes in
 * this repo, which disable it. Selection here is the judgement call the whole
 * step exists for, it runs once per paper, and 8000 output tokens leaves ample
 * room for both the reasoning and the twelve definitions.
 *
 * GROUNDING: the model may only choose from the candidates it is given, and
 * definitions are checked against the paper. It cannot invent a term.
 */

// Authored dictionary definitions are already good — curation only decides
// keep/drop for those. Everything else gets a written definition and is stored
// as `llm_definition`.
//
// A type guard rather than a plain Set: it is what proves the extraction-only
// `paper_acronym` channel can never reach the database, since a non-grounded
// candidate always has its source rewritten below.
const GROUNDED_SOURCES = ['research_glossary', 'stats_guide', 'methods_guide', 'data_quality_guide'] as const
type GroundedSource = (typeof GROUNDED_SOURCES)[number]

function isGrounded(source: ExtractedTerm['source']): source is GroundedSource {
  return (GROUNDED_SOURCES as readonly string[]).includes(source)
}

const SYSTEM_PROMPT = `You are building a vocabulary flashcard deck for a high-school student who is reading a research paper for a science-fair project. You will be given the paper's title, an excerpt, and a numbered list of candidate terms extracted mechanically from the paper.

Pick the terms that are genuinely worth learning, and write a definition for each one that needs it.

WHAT IS WORTH A CARD
- Technical terms, methods, materials, mechanisms, and measures a student would have to look up to follow the paper's argument.
- Domain jargon the authors use as shorthand (e.g. "series elastic actuator", "plantarflexion", "ground reaction force").
- Research/statistics concepts that genuinely appear in THIS paper's methods.

WHAT IS NOT WORTH A CARD — reject these even though they are frequent
- The paper's own subject, restated. If the title is about ankle-foot prostheses, then "foot", "ankle", "walking", and "prosthesis" are what the paper is ABOUT, not vocabulary to learn. A reader who opened this paper already knows them.
- Ordinary English that happens to be frequent ("range", "value", "method", "result").
- A candidate whose match is clearly wrong for this paper: mechanical extraction is case-insensitive in places, so a statistics term like "OR" (odds ratio) may have matched the ordinary word "or", and "n" may have matched a stray letter. If the paper does not actually use the concept, drop it.
- Fragments, mis-split phrases, or author names.

WRITING DEFINITIONS
- Write one for every selected term whose "definition" field is empty.
- 1-3 sentences. Explain it to a bright 15-year-old who has not taken the course. Say what it IS and why it matters here.
- Ground it in the paper: the quote shows how this paper uses the term. Define the sense the paper uses, not another field's sense.
- Never write "no definition available" or refer to the card, the deck, or yourself.
- If a candidate's "definition" field is already filled in, it comes from an authored guide — do NOT rewrite it. Leave definition empty for those and just select them.

RULES
- Select at most ${VOCAB_MAX_TERMS_PER_PAPER} terms. Fewer is fine — a short deck of real vocabulary beats a padded one.
- Only select terms by an "id" from the candidate list. Never invent a term.
- If you cannot confidently define a term from the paper, do not select it.`

/**
 * The API-enforced output shape. Hand-written rather than derived via the SDK's
 * `zodOutputFormat`, which requires zod v4 schemas — this repo validates on
 * zod 3's classic API everywhere, and running two zod dialects to save a dozen
 * lines is not worth the footgun. `CurationSchema` below re-validates what
 * comes back, so the shape is still checked in one place at runtime.
 */
const CURATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    selected: {
      type: 'array',
      description: 'The terms worth learning, best first.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'The candidate id from the list.' },
          definition: {
            type: 'string',
            description:
              'A 1-3 sentence definition for a 15-year-old, grounded in this paper. Empty string if the candidate already had an authored definition.',
          },
        },
        required: ['id', 'definition'],
        additionalProperties: false,
      },
    },
  },
  required: ['selected'],
  additionalProperties: false,
} as const

const CurationSchema = z.object({
  selected: z.array(z.object({ id: z.number().int(), definition: z.string() })),
})

/**
 * Cards to build, after curation. `definition` is always non-empty, and
 * `source` is a storable `vocab_source` — the extraction-only `paper_acronym`
 * channel has been folded into `llm_definition` by this point.
 */
export interface CuratedTerm extends Omit<ExtractedTerm, 'source'> {
  source: TermSource
  /** True when the definition was written by the model rather than authored. */
  llmDefined: boolean
}

const EXCERPT_CHARS = 6000

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function buildUserMessage(paperTitle: string, excerpt: string, candidates: ExtractedTerm[]): string {
  const list = candidates
    .map((c, i) => {
      const authored = isGrounded(c.source) ? c.definition : ''
      return [
        `[${i}] term: ${c.term}`,
        authored ? `    definition (authored — keep as-is): ${authored}` : '    definition: (none — write one)',
        c.quote ? `    used in paper: "${c.quote}"` : '    used in paper: (no usage found)',
      ].join('\n')
    })
    .join('\n\n')

  return `Paper title: ${paperTitle}\n\nPaper excerpt:\n${excerpt}\n\nCandidate terms:\n${list}`
}

/**
 * Select and define. Returns the cards to build, in deck order.
 *
 * Throws on API failure — the caller decides whether a build without curation
 * is worth serving. It is not: an uncurated deck is the trivial-word deck this
 * step exists to prevent, so `build/route.ts` surfaces the error instead.
 */
export async function curateTerms(input: {
  paperTitle: string
  excerpt: string
  candidates: ExtractedTerm[]
}): Promise<CuratedTerm[]> {
  const { paperTitle, candidates } = input
  if (candidates.length === 0) return []

  if (process.env.E2E_SKIP_LLM === '1') {
    // E2E test-mode short-circuit (same convention as every Anthropic-backed
    // lib): deterministic selection — the first N candidates in extraction
    // order — so repeated builds are byte-stable and the suite never spends
    // real API money. Authored definitions are kept as-is (mirroring the real
    // path); everything else gets a fixed fixture definition. Never set in
    // production.
    return candidates.slice(0, VOCAB_MAX_TERMS_PER_PAPER).map((c) => ({
      ...c,
      definition: c.definition
        ? c.definition
        : `[E2E fixture] Deterministic definition of "${c.term}" as used in this paper.`,
      source: isGrounded(c.source) ? c.source : 'llm_definition',
      llmDefined: !isGrounded(c.source),
    }))
  }

  const response = await aiCreate('vocab_curate', {
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: CURATION_JSON_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(paperTitle, input.excerpt.slice(0, EXCERPT_CHARS), candidates) }],
  })

  // Structured outputs guarantee the shape, but `stop_reason: "max_tokens"`
  // still truncates mid-JSON — parse defensively rather than trusting it.
  const raw = response.content.find((b) => b.type === 'text')?.text ?? ''
  const parsedJson = CurationSchema.safeParse(safeJson(raw))
  if (!parsedJson.success) {
    // Model output can echo paper text — log stop reason + length only (A7).
    logEvent({
      event: 'vocab_curate.parse_failed',
      outcome: 'error',
      detail: `stop=${response.stop_reason} len=${raw.length}`,
    })
    return []
  }
  const parsed = parsedJson.data

  const seen = new Set<string>()
  const curated: CuratedTerm[] = []
  for (const pick of parsed.selected) {
    const candidate = candidates[pick.id]
    // The model can only ever hand back an id we gave it; anything else is a
    // malformed response, not a term.
    if (!candidate) continue
    if (seen.has(candidate.termKey)) continue

    const authored = isGrounded(candidate.source)
    const definition = authored ? candidate.definition : pick.definition.trim()
    // A card with no definition is the exact failure this step removes.
    if (!definition) continue

    seen.add(candidate.termKey)
    curated.push({
      ...candidate,
      definition,
      source: isGrounded(candidate.source) ? candidate.source : 'llm_definition',
      llmDefined: !authored,
    })
    if (curated.length >= VOCAB_MAX_TERMS_PER_PAPER) break
  }

  return curated
}
