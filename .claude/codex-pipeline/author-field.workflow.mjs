/**
 * Codex field authoring workflow — the whole fan-out for `/codex-pipeline`.
 *
 * ONE invocation authors a whole FIELD: its Core plus its 5 subfield branches
 * (~45 units / ~270 lessons), or any subset the orchestrator asks for. The
 * orchestrator (Opus) does three cheap things: grep the field's TAXONOMY slice,
 * extract one example lesson, run this script. Everything expensive happens in
 * here, in subagents.
 *
 * Per segment: a BRIEF agent (Opus, xhigh) expands the taxonomy slice into a
 * full-depth unit plan. Every unit of every segment then gets one lane:
 *   author (Sonnet, high) → check (Sonnet, high) → [HIGH findings only]
 *   batched adversarial verify (2 lenses, Sonnet, medium) → fix (Sonnet, low),
 *   escalating to an Opus re-author when HIGH errors persist past a fix.
 *
 * Four things keep this affordable — all four are load-bearing, don't undo them:
 *
 *   1. THE LOOP EXITS ON `HIGH` ONLY. It used to also block on MED, which read
 *      as rigor but was a treadmill: MED is "slightly overstated" / "framing is
 *      a bit generic", and a fresh checker will always find one in 500 words of
 *      prose. Every unit ran to the round cap re-litigating opinions — the
 *      shipped review logs show 21 rounds across 8 units with ZERO open HIGH
 *      findings, i.e. ~40 of 53 agents bought nothing. MED/LOW corrections are
 *      still applied, once, by the fix agent; they just don't earn another round.
 *      HIGH is the actual gate: it's the only severity that gets the adversarial
 *      lenses, the only one that escalates, and the only one `clean` derives from.
 *   2. BRIEFING IS IN HERE, NOT IN THE ORCHESTRATOR. Briefing a segment inline
 *      meant a multi-segment run accumulated every brief, workflow result, and
 *      gate output in ONE Opus context that was re-sent on every subsequent
 *      turn — quadratic, at Opus rates, which is why 5 branches cost ~2.5x one
 *      branch while producing LESS content (the orchestrator compensated by
 *      shrinking its unit plans as it filled up). With briefs as subagents the
 *      orchestrator's context is flat in the number of segments, which is what
 *      makes a whole-field run cheaper than the 6 separate runs it replaces.
 *   3. CHECKERS QUOTE, VERIFIERS DON'T RE-READ. Each finding carries an
 *      `excerpt`, so the refute/audit lenses adjudicate from the quote + the web
 *      instead of re-reading a ~75KB draft (~20K tokens) each, per round.
 *   4. AGENTS NEVER LOAD THE BIG REFERENCES. Every prompt is assembled from
 *      `args` — a compact typed contract + ONE example lesson + the unit's own
 *      spec. Nobody reads the 654-line TAXONOMY or a multi-MB content JSON.
 *   5. RE-CHECKS ARE SCOPED, AND SEARCHES ARE BUDGETED. The check phase measured
 *      **53% of a whole field's tokens** — 89 checkers averaging 30 turns, 8.1
 *      WebSearches, and 6.7 file Reads each. The cost is almost all cache-read:
 *      every search result and file stays in context and is re-sent on all ~30
 *      turns, so a checker reaches ~2M tokens against a 60KB unit. Two structural
 *      cuts: (a) 46 of those 89 were RE-checks that re-read all six lessons and
 *      redid every search to confirm an edit to one — later rounds now see only
 *      the files the fixer touched (`scopeFrom`); (b) searches are capped and
 *      pointed at dates/attributions/numbers, which is what is actually wrong when
 *      something is wrong. Neither touches what the gate can catch.
 *
 *   6. NEVER ASK AN AGENT TO MEASURE ITS OWN OUTPUT. Enforce a target in a LATER,
 *      CHEAPER phase instead. Bought the hard way: adding "count the words of your
 *      section prose before you write each file" to the author prompt made every
 *      author build a write → `Bash` wc → `Edit` trim → recount loop, per lesson.
 *      Author turns went 22.3 → 55.7, Bash 4.7 → 12.7, Edit 0.4 → 8.7, and the
 *      phase went from 26% → 60% of the field's tokens — because every extra turn
 *      re-sends the whole context. It DID hold the band (97% inside 400-500) but
 *      cost ~5M tokens to do it, in the most expensive phase there is. The band is
 *      now enforced by the checker's out-of-band MED + the fixer (9% of spend),
 *      which is the same work at ~1/7 the price. Expect the band to be
 *      approximately, not exactly, right — that is the trade, and it is a good one.
 *
 * NOT worth optimizing, measured: the briefs are 1% of spend and Opus escalations
 * 3%. Escalation rate tracks CLAIM DENSITY, not model weakness — computer-science
 * -algorithms (3.0 dated claims + 14.4 named entities per lesson) took 16
 * escalations where classical-mechanics-physics (0.8 and 4.1) took zero. Deeper
 * briefs buy more verifiable claims, and more claims mean more real findings.
 *
 * Assembly is NOT here and must never come back: `pnpm --filter web codex:merge`
 * does it deterministically for zero tokens (drafts are JSON so a script can
 * parse them), including registry sync. This workflow's job ends at "every unit
 * draft is written and fact-checked".
 *
 * args (built by the orchestrator):
 *   { field, label, idShort, home?, labType?, taxonomySlice, contract, exampleLesson,
 *     segments: [{ id, kind, label, short, scope, targetUnits, targetLessons }] }
 *
 * `idShort` is the field's short id handle (`cmp` for classical-mechanics-physics,
 * `clinpharm` for clinical-medicine-pharmacology) — every shipped field prefixes
 * its lesson ids `<idShort>-<segment.short>-…` rather than using the full slug,
 * which keeps ids globally unique without making them enormous. codex:merge gates
 * on uniqueness itself, so this is a convention the prompts carry, not a rule the
 * script enforces.
 *
 * returns:
 *   { plan, results, allClean } — `plan` is ready to write to
 *   `.claude/codex-pipeline/plans/<field>.json` and hand to codex:merge.
 */

export const meta = {
  name: 'codex-author-field',
  description: 'Brief, author, and adversarially fact-check a whole Field Codex field (Core + 5 subfields), one lane per unit',
  phases: [
    { title: 'Brief', detail: 'one unit plan per segment — Opus, xhigh effort', model: 'opus' },
    { title: 'Draft', detail: 'one author per unit — Sonnet 5, high effort' },
    { title: 'Check', detail: 'per-unit error hunt — Sonnet 5, high effort' },
    { title: 'Verify', detail: 'batched adversarial verify of HIGH findings — Sonnet 5, medium' },
    { title: 'Fix', detail: 'apply survivors — Sonnet 5, low; Opus re-author on escalation' },
  ],
}

const MAX_ROUNDS = 3
const AGENT = 'general-purpose' // full tools: Read/Write/Edit + WebSearch for citation checks
const DRAFT_DIR = '.claude/codex-pipeline/drafts'

// `args` can arrive as a parsed object OR a JSON string (a known Workflow-tool
// footgun); accept either so the run never dies at launch on `A.segments`.
const A = typeof args === 'string' ? JSON.parse(args) : (args || {})

// ─── schemas ─────────────────────────────────────────────────────────────────

const BRIEF_SCHEMA = {
  type: 'object',
  required: ['units'],
  additionalProperties: false,
  properties: {
    units: {
      type: 'array',
      items: {
        type: 'object',
        required: ['unitId', 'unitShort', 'unitLabel', 'isLandmark', 'lessons'],
        additionalProperties: false,
        properties: {
          unitId: { type: 'string' },
          unitShort: { type: 'string' },
          unitLabel: { type: 'string' },
          isLandmark: { type: 'boolean' },
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'coverage'],
              additionalProperties: false,
              properties: { title: { type: 'string' }, coverage: { type: 'string' } },
            },
          },
        },
      },
    },
  },
}

const CHECK_SCHEMA = {
  type: 'object',
  required: ['findings'],
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        // `excerpt` lets the verify lenses skip re-reading the draft; `file` lets
        // the NEXT round's checker re-examine only what the fixer touched.
        required: ['id', 'severity', 'file', 'where', 'excerpt', 'problem', 'correction'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          severity: { enum: ['HIGH', 'MED', 'LOW'] },
          file: { type: 'string' },
          where: { type: 'string' },
          excerpt: { type: 'string' },
          problem: { type: 'string' },
          correction: { type: 'string' },
        },
      },
    },
  },
}

const VERDICTS_SCHEMA = {
  type: 'object',
  required: ['verdicts'],
  additionalProperties: false,
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['findingId', 'refuted', 'correctionAccurate', 'note'],
        additionalProperties: false,
        properties: {
          findingId: { type: 'string' },
          refuted: { type: 'boolean' },
          correctionAccurate: { type: 'boolean' },
          note: { type: 'string' },
        },
      },
    },
  },
}

const AUTHOR_SCHEMA = {
  type: 'object',
  required: ['unitId', 'wrote', 'lessonCount'],
  additionalProperties: false,
  properties: {
    unitId: { type: 'string' },
    wrote: { type: 'boolean' },
    lessonCount: { type: 'integer' },
    note: { type: 'string' },
  },
}

// ─── prompts ─────────────────────────────────────────────────────────────────

function briefPrompt(seg) {
  return `You are planning ONE segment of the "${A.label}" Field Codex track — a science-fair learning track for advanced-high-school / AP students. Return a unit plan; do NOT write any lesson content.

THE FIELD (its canonical taxonomy entry — the authoritative scope):
${A.taxonomySlice}

YOUR SEGMENT: ${seg.label}  (id: ${seg.id}, kind: ${seg.kind})
Scope: ${seg.scope}

Plan ${seg.targetUnits} units totalling ${seg.targetLessons} lessons (5-7 lessons per unit). DEPTH IS THE POINT and the target is load-bearing: a student spends ~6 months in ~3 fields, so this segment must carry ${seg.targetLessons} real lessons. A shallow plan starves the product — do not under-plan.

Order the units: fundamentals → methods/instruments → interpretation → landmark work & open debates → advanced → applications.

REQUIRED — exactly one unit must be the "Landmark Work & Open Debates" unit (set isLandmark: true on it, and false on every other unit). Across the segment, allocate real coverage to: landmark studies/experiments and the people behind them; live debates, controversies, and open questions; historical development; competing methods and schools of thought; real applications and case studies. A glossary does not arm a student for judge Q&A — this is what does.

For each unit give:
- unitId: "${A.idShort}-${seg.short}-<unit-slug>" (slug-safe: lowercase, digits, single hyphens)
- unitShort: a short slug-safe handle for the unit, unique within this segment (e.g. "sampling")
- unitLabel: the human label
- isLandmark: true for the one landmark unit, false otherwise
- lessons: 5-7 entries, each { title, coverage } — coverage is 1-2 sentences naming the SPECIFIC mechanisms, numbers, studies, or debates that lesson must actually teach. Be concrete; the author agent has only your coverage line to work from.

Do not duplicate another segment's territory: Core owns the shared foundation, each branch owns its own subfield as scoped in the taxonomy entry above.`
}

function authorPrompt(seg, unit) {
  return `You are authoring ONE unit of the "${seg.label}" segment of the "${A.label}" Field Codex track. Write REAL, substantive AP / advanced-high-school science — mechanisms, named studies, numbers, history, competing views — NOT dictionary definitions. Depth is the whole point.

TYPED SHAPE — author DIRECTLY into this shape (never prose-first-then-convert, which drops answer keys):
${A.contract}

ONE EXAMPLE LESSON (shape reference ONLY — do not reuse its content or topic):
${A.exampleLesson}

YOUR UNIT: ${unit.unitLabel}  (unit id: ${unit.unitId})${unit.isLandmark ? '\nThis is the LANDMARK WORK & OPEN DEBATES unit — name real studies, researchers, dates, and the ACTUAL controversy, accurately.' : ''}

Author exactly these ${unit.lessons.length} lessons. Each one is a SEPARATE FILE and a SEPARATE Write call, at the exact path given:
${unit.lessons.map((l, i) => `  ${i + 1}. ${l.path}\n     id:       ${l.id}\n     title:    ${l.title}\n     coverage: ${l.coverage}`).join('\n')}

**ONE Write PER LESSON — this is a hard requirement, not a style preference.** Write lesson 1 to its path, then lesson 2 to its path, and so on: ${unit.lessons.length} separate Write calls. Do NOT batch several lessons into one call and do NOT assemble the whole unit in a single file — a whole-unit write is ~65KB in one tool call, and it reliably drops the connection mid-response and loses the entire unit's work. A per-lesson write is ~11KB and completes safely. There is no unit-level file: the build script assembles the unit from these lesson files using the ids above.

Each file contains ONE \`Lesson\` JSON object — { "id", "label", "readingMinutes", "sections", "workedExample", "judgeFraming", "checkpoint" } — and nothing else. No unit wrapper, no array.

RULES:
- Use the exact "id" given above for each lesson; do not invent your own. (They are prefixed to stay globally unique across the 29-field library; the merge step rejects any collision.)
- Each lesson: 2-4 sections totalling **400-500 words** of substantive prose, a concrete ~100-150 word workedExample, an ~80-120 word judgeFraming tied to THAT concept (why a fair judge probes it), readingMinutes 4-6, and a 3-5 question checkpoint mixing mc / ordering / matching.
- **400-500 is a BAND WITH TWO EDGES, and both bind — write to it by feel, in one pass.** Under ~380 means you summarized the coverage line instead of teaching the mechanism behind it — name the studies, the people, the dates, the numbers. Over ~520 means you are spending the student's reading time on nothing: cut throat-clearing ("It is important to understand that..."), restatement of what you just said, and the third example — **never** cut a named study, a date, or a figure to get under the ceiling. Density is the goal, not length: the strongest lessons in this library sit near 450 words while naming ~3 dated claims and a dozen real people or systems. A 700-word lesson is not deeper than a 450-word one, it is looser.
- **Do NOT measure your own word count.** Do not shell out to \`wc\`, and do not write-then-trim-then-recount. Estimate by eye and move on; a lesson that lands at 520 is fine and a later pass will tighten it. (This is not a style note — an earlier run told authors to count their words and they built a write → count → edit → recount loop per lesson, tripling this phase's cost for a handful of words. Your job is to write it well once.)
- Every MC option (INCLUDING the correct one) needs an explanation; ordering needs a correctOrder that is a permutation of every item id; matching needs correctPairs covering every left id exactly once.
- Get the SCIENCE RIGHT: correct numbers, units, and correctly-keyed answers. A mis-keyed checkpoint teaches something false. Use WebSearch to confirm any named study / researcher / date / figure you are not certain of.
- Strict JSON only: double-quoted keys and strings, no comments, no trailing commas, no \`export\`, no JS. Escape any interior double quote. Each file must parse with JSON.parse — a build script reads it directly, and prose apostrophes ("Sony's", "Békésy's") are safe inside double quotes.

When all ${unit.lessons.length} files are written, return { unitId: "${unit.unitId}", wrote: true, lessonCount }.`
}

/** The lesson files a checker/fixer works over, as a prompt-ready list. */
function fileList(lessons) {
  return lessons.map((l) => `  - ${l.path}`).join('\n')
}

/**
 * @param {object} unit
 * @param {string[]|null} scope Lesson paths to re-examine. null = the whole unit
 *   (round 1). On later rounds this is ONLY what the fixer just touched: a
 *   re-check exists to confirm a correction landed, and re-reading + re-searching
 *   five untouched lessons to do that was the single largest waste in the run —
 *   the check phase was 53% of all tokens, and 46 of 89 checks were re-checks.
 */
function checkPrompt(unit, scope) {
  const lessons = scope?.length ? unit.lessons.filter((l) => scope.includes(l.path)) : unit.lessons
  const isRecheck = Boolean(scope?.length)
  // Searches are the checker's dominant cost: each result stays in context and is
  // re-sent on every later turn, and the run averaged 8.1 of them per checker.
  // Budget them, and spend them where claims are actually wrong when wrong.
  const budget = isRecheck ? 2 : 4

  return `Adversarially fact-check the Field Codex unit "${unit.unitLabel}". Its lessons are one JSON \`Lesson\` object per file:
${fileList(lessons)}
${isRecheck ? `
THIS IS A RE-CHECK. The ${lessons.length === 1 ? 'lesson' : 'lessons'} above ${lessons.length === 1 ? 'was' : 'were'} just corrected in response to earlier findings. Your job is narrow: confirm the corrections actually landed and are right, and catch anything the edit newly broke. The unit's OTHER lessons were already checked and have not changed — do NOT read or re-verify them.
` : ''}
Read EVERY file listed above. Your ONLY job is to find errors — do NOT edit them. Flag:
- HIGH — any answer key (answerId / correctOrder / correctPairs) inconsistent with its explanation or the science (a wrong key is auto-HIGH); any named study / researcher / date / figure that is misattributed, wrong, or FABRICATED (a fabricated citation is HIGH).
- MED — a scientifically overstated or imprecise claim in prose or workedExample; a judgeFraming that is generic filler not tied to its concept; a lesson whose section prose falls outside the **400-500 word band**: under ~370 is under-written (\`correction\` names the specific mechanism, study, or number it should have taught instead of summarizing), over ~540 is padded (\`correction\` names what to CUT — restatement, throat-clearing, a redundant third example — and must never propose cutting a named study, date, or figure).
- LOW — minor phrasing / typos.

**WebSearch budget: at most ${budget} calls.** Do not spend them confirming textbook facts you already know cold, and do not verify one claim per search when a single search settles several. Spend them on what is actually wrong when it is wrong: **specific dates, attributions of a result to a person or paper, and precise numeric figures** — especially any that look confidently specific but unfamiliar. Reason from your own knowledge for everything else; if you are genuinely unsure about a claim and have no budget left, flag it MED and say so in \`problem\` rather than burning a search.

For EACH finding return { id, severity, file, where, excerpt, problem, correction }.
- \`file\` MUST be the exact file path from the list above that the finding is in — it is used to route the fix and to scope the next re-check, so a wrong path silently drops your finding.
- \`where\` is the lesson id + which field (e.g. "sections[1]" or "checkpoint q2 answerId").
- \`excerpt\` MUST be the VERBATIM offending text copied from the draft (the claim, or the question + its key) — quote enough that someone who has not opened the file can judge the finding from your excerpt alone. Downstream verifiers rely on it and will not re-read the file.

If everything you read is clean, return an empty findings array. Do not invent findings to look thorough — an empty array is the expected result for a good ${isRecheck ? 'correction' : 'unit'}.`
}

function refutePrompt(unit, highs) {
  return `You are the DEFENSE. Below are HIGH-severity fact-check findings against a Field Codex unit draft, each quoting the text it accuses. For EACH finding, try hard to REFUTE it — show the draft's quoted text was actually CORRECT and the finding is a checker hallucination. Judge from the excerpt and verify the science with WebSearch. You do NOT need to open the draft file; the excerpt is the evidence.
Findings:
${JSON.stringify(highs, null, 2)}
Return verdicts: [{ findingId, refuted (true ONLY if you clearly showed the draft was right), correctionAccurate (set false — not your lens), note }]. Default refuted:false when unsure.`
}

function auditPrompt(unit, highs) {
  return `You are the CORRECTIONS AUDITOR. Below are HIGH-severity fact-check findings against a Field Codex unit draft, each quoting the offending text and proposing a correction. For each, judge whether the proposed CORRECTION is itself accurate — do not trust it blindly; verify the corrected claim / key with WebSearch. Judge from the excerpt; you do NOT need to open the draft file.
Findings:
${JSON.stringify(highs, null, 2)}
Return verdicts: [{ findingId, refuted (set false — not your lens), correctionAccurate (true if the correction is right), note (the right fix if the correction is wrong) }].`
}

function fixPrompt(unit, toApply) {
  return `Apply these fact-check corrections to the Field Codex unit "${unit.unitLabel}". Its lessons are one JSON \`Lesson\` per file:
${fileList(unit.lessons)}

Each finding names the file it belongs to in its \`file\` field. Edit only the files with findings. Make the minimal correct change per finding — fix the claim, number, unit, answer key, or judgeFraming — and preserve each file's \`Lesson\` shape and its lesson id exactly. Where an auditorNote says the proposed correction is wrong, derive the correct fix yourself (verify with WebSearch).
Every file you touch must still parse with JSON.parse: double-quoted keys and strings, no comments, no trailing commas. Prefer Edit over Write so you never rewrite a whole file for a one-line fix.
Findings to apply:
${JSON.stringify(toApply, null, 2)}
Return a one-line summary of what changed.`
}

function reauthorPrompt(unit, survivingHigh) {
  return `The Field Codex unit "${unit.unitLabel}" STILL has HIGH-severity factual errors after fixes. Its lessons are one JSON \`Lesson\` per file:
${fileList(unit.lessons)}

Re-author ONLY the affected lessons (the findings name their files). Fix every listed error at the root — rewrite the lesson prose and/or checkpoint as needed, get the science and answer keys right, verify named studies with WebSearch — and keep each file's \`Lesson\` shape and its existing lesson id.
Rewrite one file per Write call; never batch several lessons into a single call. Each file must parse with JSON.parse: double-quoted keys and strings, no comments, no trailing commas.
Unresolved HIGH findings:
${JSON.stringify(survivingHigh, null, 2)}
Return { unitId: "${unit.unitId}", wrote: true, lessonCount }.`
}

// ─── the per-unit lane ───────────────────────────────────────────────────────

async function authorAndVerifyUnit(seg, unit) {
  // A lane that loses its author has nothing to check, so retry once before
  // giving up. agent() resolves to null when a subagent dies on a terminal API
  // error — most often a dropped connection part-way through a long response.
  // The lesson paths are deterministic, so a retry overwrites the same files
  // rather than leaving a half-written unit behind.
  let wrote = await agent(authorPrompt(seg, unit), {
    agentType: AGENT, model: 'sonnet', effort: 'high', phase: 'Draft',
    label: `author:${seg.short}/${unit.unitShort}`, schema: AUTHOR_SCHEMA,
  })
  if (!wrote) {
    log(`↻ ${seg.short}/${unit.unitShort}: author died — retrying once`)
    wrote = await agent(authorPrompt(seg, unit), {
      agentType: AGENT, model: 'sonnet', effort: 'high', phase: 'Draft',
      label: `author-retry:${seg.short}/${unit.unitShort}`, schema: AUTHOR_SCHEMA,
    })
  }
  if (!wrote) {
    // Don't run a checker against files that may not exist. Report the lane as
    // dirty so the orchestrator re-runs it rather than merging a missing unit.
    log(`✗ ${seg.short}/${unit.unitShort}: author died twice — lane abandoned`)
    return {
      segmentId: seg.id, unitId: unit.unitId, rounds: 0, clean: false,
      openHigh: [{ id: 'author-dead', severity: 'HIGH', where: unit.unitId, excerpt: '', problem: 'author agent died twice; unit not written', correction: 're-run this unit' }],
    }
  }

  /**
   * Lesson paths the previous round's fixer touched — the ONLY files the next
   * check needs to look at. null on round 1 (check the whole unit). Falls back to
   * null if findings carry no usable `file`, so a malformed finding degrades to a
   * full re-check rather than silently skipping the unit.
   */
  const scopeFrom = (findings) => {
    const paths = new Set(unit.lessons.map((l) => l.path))
    const hit = [...new Set(findings.map((f) => f.file).filter((p) => paths.has(p)))]
    return hit.length ? hit : null
  }

  let openHigh = []
  let rounds = 0
  let scope = null
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    rounds = round
    const check = await agent(checkPrompt(unit, scope), {
      agentType: AGENT, model: 'sonnet', effort: 'high', phase: 'Check',
      label: `check:${seg.short}/${unit.unitShort}#${round}${scope ? `(${scope.length}/${unit.lessons.length})` : ''}`,
      schema: CHECK_SCHEMA,
    })
    const findings = check?.findings ?? []
    const highs = findings.filter((f) => f.severity === 'HIGH')
    const others = findings.filter((f) => f.severity !== 'HIGH')

    // Adversarial verify ONLY for HIGH findings, batched to 2 lenses per unit.
    // A clean unit never spawns a verifier at all.
    let survivingHigh = highs
    let auditVerdicts = []
    if (highs.length > 0) {
      const [refute, audit] = await parallel([
        () => agent(refutePrompt(unit, highs), {
          agentType: AGENT, model: 'sonnet', effort: 'medium', phase: 'Verify',
          label: `refute:${seg.short}/${unit.unitShort}#${round}`, schema: VERDICTS_SCHEMA,
        }),
        () => agent(auditPrompt(unit, highs), {
          agentType: AGENT, model: 'sonnet', effort: 'medium', phase: 'Verify',
          label: `audit:${seg.short}/${unit.unitShort}#${round}`, schema: VERDICTS_SCHEMA,
        }),
      ])
      const refuted = new Set((refute?.verdicts ?? []).filter((v) => v.refuted === true).map((v) => v.findingId))
      auditVerdicts = audit?.verdicts ?? []
      // A HIGH finding survives unless the defense clearly refuted it (draft was right).
      survivingHigh = highs.filter((f) => !refuted.has(f.id))
    }

    const toApply = [...survivingHigh, ...others]
    if (toApply.length === 0) {
      return { segmentId: seg.id, unitId: unit.unitId, rounds: round, clean: true, openHigh: [] }
    }

    // Attach auditor notes so the fixer knows which corrections to distrust.
    const enriched = toApply.map((f) => {
      const a = auditVerdicts.find((v) => v.findingId === f.id)
      return a && a.correctionAccurate === false ? { ...f, auditorNote: a.note } : f
    })
    await agent(fixPrompt(unit, enriched), {
      agentType: AGENT, model: 'sonnet', effort: 'low', phase: 'Fix',
      label: `fix:${seg.short}/${unit.unitShort}#${round}`,
    })

    // Ship once no HIGH survives. MED/LOW were just applied by the fix above and
    // do NOT earn another round — see the header note: blocking on MED made every
    // unit run to the round cap re-litigating a checker's taste, for no measured
    // gain in the shipped review logs.
    if (survivingHigh.length === 0) {
      return { segmentId: seg.id, unitId: unit.unitId, rounds: round, clean: true, openHigh: [] }
    }

    // Escalate to Opus when HIGH errors persist past the first fix round.
    if (round >= 2 && round < MAX_ROUNDS) {
      log(`↑ ${seg.short}/${unit.unitShort}: HIGH errors persisted — escalating to an Opus re-author`)
      await agent(reauthorPrompt(unit, survivingHigh), {
        agentType: AGENT, model: 'opus', effort: 'high', phase: 'Draft',
        label: `opus-reauthor:${seg.short}/${unit.unitShort}`, schema: AUTHOR_SCHEMA,
      })
    }
    // The next round only re-examines what this round's fix (and any re-author)
    // actually touched. Both work from `enriched`, so its files are the changed set.
    scope = scopeFrom(enriched)
    openHigh = survivingHigh
  }

  // A HIGH found on the FINAL round gets a fix applied but no confirming re-check
  // inside the loop, so it would be reported "open" even when the fix resolved it.
  // Re-check once here so `openHigh` reflects the file's true final state — scoped,
  // like every other re-check, to the lessons the last fix touched.
  if (openHigh.length > 0) {
    const finalCheck = await agent(checkPrompt(unit, scope), {
      agentType: AGENT, model: 'sonnet', effort: 'high', phase: 'Check',
      label: `recheck:${seg.short}/${unit.unitShort}`, schema: CHECK_SCHEMA,
    })
    openHigh = (finalCheck?.findings ?? []).filter((f) => f.severity === 'HIGH')
  }

  return { segmentId: seg.id, unitId: unit.unitId, rounds, clean: openHigh.length === 0, openHigh }
}

// ─── run ─────────────────────────────────────────────────────────────────────

const segments = A.segments ?? []
log(`Briefing ${segments.length} segment(s) of ${A.label}: ${segments.map((s) => s.id).join(', ')}`)

// Brief every segment concurrently. This is a barrier on purpose — the unit
// plans define the lanes, so there is nothing to author until they all land, and
// the orchestrator needs the full plan back to hand codex:merge.
const briefs = await parallel(
  segments.map((seg) => () =>
    agent(briefPrompt(seg), {
      // Opus at xhigh — the briefs are the one place raising the tier is worth it.
      // They own DEPTH (which units exist, which studies/debates/history get named),
      // one brief steers ~7 author lanes, and the six of them together are only a
      // few percent of a field's spend. Everything downstream can only be as good
      // as the coverage lines these produce.
      agentType: AGENT, model: 'opus', effort: 'xhigh', phase: 'Brief',
      label: `brief:${seg.short}`, schema: BRIEF_SCHEMA,
    }).then((b) => ({ seg, units: b?.units ?? [] })),
  ),
)

const planned = briefs.filter(Boolean).filter((b) => b.units.length > 0)
for (const b of briefs.filter(Boolean)) {
  if (b.units.length === 0) log(`⚠ ${b.seg.id}: brief returned no units — segment skipped`)
}

/**
 * Title → slug-safe id fragment. Truncate BEFORE trimming separators: cutting a
 * long title at a fixed width can land mid-hyphen, and a trailing "-" fails the
 * slug-safety gate. (It did, on the first live run — three lessons out of 275.)
 */
const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/^-+|-+$/g, '')

/**
 * Resolve a brief's units into lanes, giving every lesson a DETERMINISTIC id and
 * file path up front. Deterministic matters twice over: a retried author
 * overwrites exactly the files its dead predecessor was writing (no orphans),
 * and the plan can name every file codex:merge must find — so a lesson lost to a
 * dropped connection is a named merge error, not a silently short unit.
 */
function resolveUnit(seg, u) {
  const dir = `${DRAFT_DIR}/${A.field}-${seg.short}-${u.unitShort}`
  const seen = new Set()
  const lessons = u.lessons.map((l, i) => {
    let slug = slugify(l.title)
    while (seen.has(slug)) slug = `${slug}-${i + 1}` // titles can collide; ids cannot
    seen.add(slug)
    return {
      ...l,
      id: `${u.unitId}-${slug}`,
      path: `${dir}/${String(i + 1).padStart(2, '0')}-${slug}.json`,
    }
  })
  return { ...u, dir, lessons }
}

const lanes = planned.flatMap(({ seg, units }) => units.map((u) => ({ seg, unit: resolveUnit(seg, u) })))

const totalLessons = lanes.reduce((n, l) => n + l.unit.lessons.length, 0)
log(`Plan: ${planned.length} segments, ${lanes.length} units, ${totalLessons} lessons. One lane per unit, one file per lesson (Sonnet default, Opus on escalation).`)

const results = (await parallel(lanes.map(({ seg, unit }) => () => authorAndVerifyUnit(seg, unit)))).filter(Boolean)

// The plan codex:merge consumes. Only units whose lane came back CLEAN get in: a
// dead or still-dirty lane must never become a missing/known-bad unit at merge.
const shipped = new Set(results.filter((r) => r.clean).map((r) => r.unitId))
const byUnitId = new Map(lanes.map(({ unit }) => [unit.unitId, unit]))
const plan = {
  slug: A.field,
  label: A.label,
  home: A.home === true,
  ...(A.labType ? { labType: A.labType } : {}),
  segments: planned.map(({ seg, units }) => ({
    id: seg.id,
    kind: seg.kind,
    label: seg.label,
    units: units
      .filter((u) => shipped.has(u.unitId))
      .map((u) => {
        const r = byUnitId.get(u.unitId)
        return { id: u.unitId, label: u.unitLabel, lessons: r.lessons.map((l) => ({ id: l.id, path: l.path })) }
      }),
  })),
}

const dirty = results.filter((r) => !r.clean)
const lost = lanes.length - results.length
log(`Done: ${results.length}/${lanes.length} units authored, ${results.filter((r) => r.clean).length} clean${dirty.length ? `, ${dirty.length} with open HIGH findings: ${dirty.map((r) => r.unitId).join(', ')}` : ''}${lost ? `, ${lost} lane(s) died` : ''}.`)

return { plan, results, allClean: dirty.length === 0 && lost === 0 }
