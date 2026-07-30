/**
 * Field Codex REPAIR workflow — applies audited findings to shipped lessons.
 *
 * Third piece of the audit loop: `author-field` writes, `audit-field` finds,
 * this one fixes. It exists because hand-authoring repairs stops scaling —
 * 22 findings was feasible inline, 61 was not, and the remaining fields will
 * produce more.
 *
 * Each agent gets a batch JSON listing lessons and the findings against them,
 * edits the EXTRACTED WORKING COPIES in place (never the multi-MB content JSON —
 * that stays untouched until a deterministic merge-back script validates every
 * edited file), and returns what it changed.
 *
 * The one rule that matters here is PROPAGATION, and it is the whole reason the
 * authoring pipeline needed an Opus escalation tier: a finding names ONE
 * location, but the fact it corrects usually appears two or three times in a
 * lesson — body, workedExample, judgeFraming, checkpoint prompt, option text,
 * explanations, answer key. Fixing only the cited site leaves the lesson stating
 * the right fact in one place and the wrong one in another, which is strictly
 * worse than not fixing it: the contradiction is invisible to the student and
 * to the next checker, and it is what shipped in the Klem lesson.
 *
 * args: { dir, batches: [{ b, n, k }] }   // b = batch filename, n = lessons, k = findings
 * returns: { edited, failures, stats }
 */

export const meta = {
  name: 'codex-repair-findings',
  description: 'Apply audited fact-check findings to extracted Field Codex lesson files, propagating each correction across the whole lesson',
  phases: [{ title: 'Repair', detail: 'one agent per batch of lessons — Sonnet 5, high effort' }],
}

const AGENT = 'general-purpose'
const A = typeof args === 'string' ? JSON.parse(args) : args || {}

const REPAIR_SCHEMA = {
  type: 'object',
  required: ['lessons'],
  additionalProperties: false,
  properties: {
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lessonId', 'applied', 'sitesChanged', 'note'],
        additionalProperties: false,
        properties: {
          lessonId: { type: 'string' },
          applied: { type: 'number', description: 'how many of this lesson findings were applied' },
          sitesChanged: { type: 'number', description: 'how many distinct text locations were edited (>= applied when a fact repeated)' },
          note: { type: 'string', description: 'one line: what changed, or why a finding was rejected' },
        },
      },
    },
  },
}

function repairPrompt(batch) {
  return `Apply audited fact-check corrections to shipped Field Codex lessons.

Read ${A.dir}${batch.b}. It is a JSON array; each entry has \`file\` (a lesson file path), \`lessonId\`, and \`findings\` (each with severity, kind, where, excerpt, problem, correction).

For each entry: read the lesson file, apply every finding, and WRITE THE FILE BACK. Edit the files listed — nothing else.

**PROPAGATE EVERY CORRECTION ACROSS THE WHOLE LESSON.** This is the rule the whole task turns on. A finding cites ONE location, but the fact it corrects usually lives in two or three places: section bodies, workedExample, judgeFraming, checkpoint prompts, option text, explanations, and the answerId / correctOrder / correctPairs answer key. After applying a correction, search the entire lesson for every other statement of the old claim and fix those too. A half-applied correction is worse than none — it leaves the lesson asserting the corrected fact in one place and the stale one in another, where neither a student nor the next checker will catch it.

Then re-read each checkpoint against the corrected prose and confirm every answer key still follows from it, and that no section now contradicts another.

**Judgment is expected, not blind application.** The \`correction\` field is a proposal from the auditor, not gospel. If it is wrong, or if the finding itself is mistaken, derive the right fix instead — verify with WebSearch when the claim is checkable. If a finding is simply wrong and the lesson was already correct, change nothing for it and say so in \`note\`. **Budget: at most 4 WebSearch calls for this whole batch**, spent only on claims you cannot settle from your own knowledge.

**Hard constraints — a violation breaks the merge:**
- NEVER change a lesson's \`id\`. It is a global key.
- Keep the exact \`Lesson\` shape: { id, label, readingMinutes, sections, workedExample, judgeFraming, checkpoint } and nothing else.
- Every MC option (including the correct one) must still have an explanation; \`correctOrder\` must remain a permutation of every item id; \`correctPairs\` must still cover every left id exactly once; the checkpoint must still hold 3-5 questions.
- Each file must still parse with \`JSON.parse\`: double-quoted keys and strings, no comments, no trailing commas. The content uses STRAIGHT apostrophes (') — keep it that way.
- Prefer targeted edits over rewriting a whole file.

Make the prose read naturally after the fix — do not leave a patched-in clause that contradicts the sentence around it.

Return one entry per lesson you were given.`
}

const batches = A.batches || []
log(`Repairing ${batches.reduce((n, b) => n + b.k, 0)} findings across ${batches.reduce((n, b) => n + b.n, 0)} lessons in ${batches.length} batches.`)

const results = await parallel(
  batches.map((b, i) => () =>
    agent(repairPrompt(b), {
      agentType: AGENT,
      model: 'sonnet',
      effort: 'high',
      phase: 'Repair',
      label: `repair:${b.b.replace('.json', '')}`,
      schema: REPAIR_SCHEMA,
    }),
  ),
)

const edited = results.filter(Boolean).flatMap((r) => r.lessons || [])
const dead = results.filter((r) => !r).length
const stats = {
  batches: batches.length,
  deadBatches: dead,
  lessonsReported: edited.length,
  findingsApplied: edited.reduce((n, l) => n + (l.applied || 0), 0),
  sitesChanged: edited.reduce((n, l) => n + (l.sitesChanged || 0), 0),
  rejected: edited.filter((l) => (l.applied || 0) === 0).length,
}
log(`Done: ${stats.findingsApplied} findings applied across ${stats.sitesChanged} text sites${dead ? ` (${dead} batch(es) died)` : ''}.`)

return { edited, stats }
