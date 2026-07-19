import { anthropic } from '@/lib/anthropic'

export interface RelevanceResult {
  relevant: boolean
  reason: string
}

const SYSTEM_PROMPT = `You are evaluating whether a research paper belongs in a literature review for a specific student project. Science and engineering are deeply interdisciplinary, so apply a generous but principled standard.

A paper is RELEVANT if:
- It directly addresses the research topic or a core subcomponent of it
- It covers a material, mechanism, method, algorithm, or technology that the project depends on or evaluates
- It provides foundational theory the student needs to understand or validate their approach
- It covers an adjacent area that genuinely informs design decisions (e.g. actuator types for a prosthetics project, or signal processing for a neural interface project)

A paper is IRRELEVANT if:
- It shares a broad domain label but has no meaningful connection to what the student is actually building or studying
- The only link is superficial (same general field, different application with no transferable knowledge)

Return only valid JSON: { "relevant": true | false, "reason": "one concise sentence" }`

/**
 * Deterministic relevance used ONLY when `E2E_SKIP_LLM=1` (never in production).
 *
 * Every other LLM-backed feature already has one of these; relevance did not, so
 * the topic-wipe path silently fell back to "keep everything" under the E2E flag
 * — the batch parse-failure default. That made the one destructive flow in the
 * app untestable: a spec could never observe a paper being proposed for removal.
 *
 * The rule is plain token overlap between the topic and the paper's own text, so
 * an obviously off-topic fixture comes out irrelevant without any model call.
 */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'their', 'under',
  'over', 'a', 'an', 'of', 'in', 'on', 'to', 'is', 'are', 'be', 'by', 'its',
])

function contentTokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3 && !STOPWORDS.has(t)),
  )
}

function stubRelevance(topic: string, paperText: string): boolean {
  const topicTokens = contentTokens(topic)
  if (topicTokens.size === 0) return true
  const paperTokens = contentTokens(paperText)
  for (const t of topicTokens) {
    if (paperTokens.has(t)) return true
    // Cheap stem tolerance: "symbiont" vs "symbionts", "coral" vs "corals".
    for (const p of paperTokens) {
      if (p.startsWith(t) || t.startsWith(p)) return true
    }
  }
  return false
}

function skipLlm(): boolean {
  return process.env.E2E_SKIP_LLM === '1'
}

/**
 * Check whether a single paper is relevant to the team's research topic.
 * Called synchronously during upload so irrelevant papers can be rejected before
 * the DB row is created.
 */
export async function checkPaperRelevance(
  topic: string,
  paperTitle: string,
  textExcerpt: string,
): Promise<RelevanceResult> {
  const excerpt = textExcerpt.slice(0, 3500)

  if (skipLlm()) {
    const relevant = stubRelevance(topic, `${paperTitle} ${excerpt}`)
    return {
      relevant,
      reason: relevant ? '' : '[E2E fixture] No overlap with the research topic.',
    }
  }

  const response = await anthropic().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Research topic: "${topic}"\n\nPaper title: ${paperTitle}\n\nPaper excerpt:\n${excerpt}`,
      },
    ],
  })

  try {
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (typeof parsed.relevant === 'boolean') {
        return { relevant: parsed.relevant, reason: parsed.reason ?? '' }
      }
    }
  } catch {
    // If parsing fails, default to allowing the upload
  }

  return { relevant: true, reason: '' }
}

/**
 * Batch-check a set of papers against a new topic in a single Claude call.
 * Used when a student changes their final topic — returns which papers should
 * be removed (not relevant to the new topic).
 *
 * Returns a Map of paperId → relevant (true = keep, false = remove).
 */
export async function batchCheckRelevance(
  newTopic: string,
  papers: Array<{ id: string; title: string; abstract: string | null }>,
): Promise<Map<string, boolean>> {
  if (papers.length === 0) return new Map()

  if (skipLlm()) {
    return new Map(
      papers.map((p) => [
        p.id,
        stubRelevance(newTopic, `${p.title} ${p.abstract ?? ''}`),
      ]),
    )
  }

  const paperList = papers
    .map((p, i) => `${i + 1}. ID: ${p.id}\n   Title: ${p.title}\n   Abstract: ${p.abstract ?? '(not yet extracted)'}`)
    .join('\n\n')

  const response = await anthropic().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `The student is changing their research topic to: "${newTopic}"\n\nFor each paper below, decide if it should stay in their literature review under this new topic.\n\nPapers:\n${paperList}\n\nReturn only valid JSON: { "results": [{ "id": "...", "relevant": true | false }] }`,
      },
    ],
  })

  const result = new Map<string, boolean>()
  // Default to keeping all papers if parsing fails
  for (const p of papers) result.set(p.id, true)

  try {
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed.results)) {
        for (const r of parsed.results) {
          if (typeof r.id === 'string' && typeof r.relevant === 'boolean') {
            result.set(r.id, r.relevant)
          }
        }
      }
    }
  } catch {
    // Default to keeping all on parse failure
  }

  return result
}
