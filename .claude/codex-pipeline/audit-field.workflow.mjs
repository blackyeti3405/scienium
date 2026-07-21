/**
 * Field Codex AUDIT workflow — fact-checks ALREADY-SHIPPED content.
 *
 * This is the retrospective twin of `author-field.workflow.mjs`. That one checks
 * drafts in flight; this one checks what actually landed in
 * `content/<slug>.json`, which is where defects that survived the authoring
 * pipeline live. It exists because a 40-lesson hand sample of shipped ecology
 * found a ~20% defect rate — 5 HIGH, 3 MED — after every authoring gate passed.
 *
 * Cost shape, deliberately different from the authoring workflow:
 *   - ONE agent per batch of lessons, not per lesson. The audit is read-only, so
 *     there is no per-lesson write to lose to a dropped connection, and batching
 *     amortizes the (identical) instruction block across 5-7 lessons.
 *   - Agents read a MANIFEST file listing their lesson paths rather than taking
 *     the paths through `args`. Workflow scripts have no filesystem access, so
 *     putting 146 paths in `args` would mean pasting them through the tool call;
 *     a manifest path is ~90 characters.
 *   - Search budget is TIERED by claim density, computed deterministically
 *     before the run (years + percentages + Name-year citations per lesson).
 *     High-density lessons — landmark/history/debate content — carry most of the
 *     checkable assertions and nearly all the observed defects; low-density
 *     mechanism lessons came back close to clean, so a flat budget over-searched
 *     the safe majority.
 *
 * The prompt hunts the failure family the ecology audit actually found: not
 * invented facts, but true facts bound to the WRONG ENTITY — the right author's
 * wrong paper, a scientist on the wrong side of a debate, two different
 * quantities framed as one, a confabulated first name, and a checkpoint asking
 * about a figure the prose no longer states.
 *
 * args: { manifests: [{ manifest, tier, n, searches }] }
 * returns: { findings, byLesson, stats }
 */

export const meta = {
  name: 'codex-audit-field',
  description: 'Fact-check shipped Field Codex lessons in density-tiered batches, hunting entity-binding defects',
  phases: [{ title: 'Audit', detail: 'one agent per batch — Sonnet 5, high effort' }],
}

const AGENT = 'general-purpose'
const A = typeof args === 'string' ? JSON.parse(args) : args || {}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lessonId', 'severity', 'kind', 'where', 'excerpt', 'problem', 'correction'],
        additionalProperties: false,
        properties: {
          lessonId: { type: 'string' },
          severity: { type: 'string', enum: ['HIGH', 'MED'] },
          kind: { type: 'string', enum: ['inconsistency', 'factual', 'arithmetic'] },
          where: { type: 'string' },
          excerpt: { type: 'string' },
          problem: { type: 'string' },
          correction: { type: 'string' },
        },
      },
    },
  },
}

function auditPrompt(batch) {
  return `Fact-check shipped Field Codex lessons${batch.fields ? ` (fields: ${batch.fields})` : ''}. The file ${batch.manifest} lists ${batch.n} lesson file paths, one per line. Read that manifest, then read EVERY lesson file it names. Each lesson file is ONE JSON \`Lesson\` object.

Do NOT edit anything. You are only reporting.

Hunt TWO classes of defect.

**1. INTERNAL INCONSISTENCY — the lesson contradicting itself.**
- Does every checkpoint answer key (answerId / correctOrder / correctPairs) actually follow from the lesson's own prose?
- Does any checkpoint option, explanation, prompt, workedExample, or judgeFraming assert a number, date, name, attribution, or direction of effect that CONTRADICTS a section body?
- Do two section bodies contradict each other?
- **Can a student derive each question's premise from this lesson?** If a stem asserts a specific figure or study result that appears nowhere in the prose, that is HIGH — either the prose was hedged and the checkpoint was left behind, or the figure is invented.
- Recompute every stated calculation by hand — means, variances, ratios, index values, doubling times, estimates. Do not trust arithmetic in the prose; a shipped lesson stated a variance that matched neither the n nor the n-1 divisor.

**2. FACTUAL ERROR — with the emphasis on BINDINGS, not isolated facts.**
Every HIGH defect found in this content so far was a true statement attached to the wrong thing. For each named person, study, figure, or dataset, ask:
- **Right work by this author?** A prolific researcher has several famous results and the lesson may have picked the wrong one. (Shipped example: a fabricated-data retraction was pinned to the author's famous and entirely legitimate other subfield.)
- **Right side of the dispute?** Verify each name's actual position in any who-argued-what passage, including whether they later changed it. (Shipped example: a scientist was listed among his opponents' defenders; he had co-authored the rebuttal with them.)
- **Same quantity?** Two numbers about one topic are often different measurements, not rigorous-vs-sloppy versions of one. (Shipped example: a share-of-land figure and a share-of-biodiversity figure were framed as one statistic.)
- **Invented given name?** Surname + year is usually right while the first name or initial is confabulated. Any initial you cannot place is HIGH.

**WebSearch budget: at most ${batch.searches} calls for this whole batch.** These lessons are ${batch.tier === 'high' ? 'CITATION-RICH — they carry multiple named studies each, which is exactly the surface the binding errors above live on. Spend the budget on researcher + year + specific-result claims, and prefer one search that settles several citations over one search each' : 'lighter on named citations — most claims here are textbook mechanism and need no search. Save the budget for anything that looks confidently specific and unfamiliar, and lean on recomputing arithmetic, which costs nothing'}. Do not search to confirm what you know cold; reason from your own knowledge and flag genuine uncertainty as MED.

Severity: **HIGH** = a wrong answer key, a self-contradiction a student would hit, a fabricated citation or person, an underivable question premise, or a flatly wrong fact. **MED** = overstated, imprecise, or wrong-in-detail but not misleading. Ignore style, phrasing, and taste entirely — an empty findings array is the expected result for good content, and inventing findings to look thorough is worse than finding nothing.

\`excerpt\` MUST be the VERBATIM offending text, quoted well enough that someone who never opens the file can judge the finding. \`where\` names the lesson field (e.g. "sections[1] body" or "checkpoint q2 explanations.c").`
}

// Accept either the long form ({ manifests: [{ manifest, tier, n, searches, fields }] })
// or a compact form ({ dir, batches: [{ m, t, n, s, f }] }) that factors the shared
// directory out of every entry — 90 batches of absolute paths is ~17KB of args,
// and the same list is ~4KB once the prefix stops repeating.
const batches = A.manifests || (A.batches || []).map((b) => ({
  manifest: `${A.dir}${b.m}`, tier: b.t, n: b.n, searches: b.s, fields: b.f,
}))
log(`Auditing ${batches.reduce((n, b) => n + b.n, 0)} shipped lessons in ${batches.length} batches (${batches.filter((b) => b.tier === 'high').length} high-density, ${batches.filter((b) => b.tier === 'mid').length} mid).`)

const results = await parallel(
  batches.map((b, i) => () =>
    agent(auditPrompt(b), {
      agentType: AGENT,
      model: 'sonnet',
      effort: 'high',
      phase: 'Audit',
      label: `audit:${b.tier}#${i + 1}`,
      schema: FINDINGS_SCHEMA,
    }),
  ),
)

const findings = results.filter(Boolean).flatMap((r) => r.findings || [])
const dead = results.filter((r) => !r).length
const byLesson = {}
for (const f of findings) (byLesson[f.lessonId] = byLesson[f.lessonId] || []).push(f)

const stats = {
  batches: batches.length,
  deadBatches: dead,
  lessonsAudited: batches.reduce((n, b) => n + b.n, 0),
  findings: findings.length,
  high: findings.filter((f) => f.severity === 'HIGH').length,
  med: findings.filter((f) => f.severity === 'MED').length,
  lessonsWithFindings: Object.keys(byLesson).length,
}
log(`Done: ${stats.high} HIGH, ${stats.med} MED across ${stats.lessonsWithFindings} lessons${dead ? ` (${dead} batch(es) died)` : ''}.`)

return { findings, byLesson, stats }
