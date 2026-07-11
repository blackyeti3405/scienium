/**
 * Codex segment authoring workflow — the token-efficient fan-out for
 * `/codex-pipeline`. The slash command (the orchestrator, on Opus) briefs the
 * segment, distills a COMPACT `args` payload (typed contract + ONE example
 * lesson + per-unit specs — never the 97KB taxonomy or the multi-MB example
 * track), then runs this script with `Workflow({ scriptPath, args })`.
 *
 * One lane per unit (units are disjoint). Each lane runs the full loop:
 *   author (Sonnet, high) → check (Sonnet, high) → [HIGH findings only]
 *   batched adversarial verify (2 lenses, Sonnet, medium) → fix (Sonnet, low),
 *   escalating to an Opus re-author only when HIGH errors persist past a fix.
 *
 * This is where the savings live vs. the old manual orchestration:
 *   - cheap-by-default models + effort (Opus reserved for escalation),
 *   - verify batched to 2 agents PER UNIT (not 2 per finding) and only for HIGH,
 *   - clean units skip verify entirely,
 *   - every agent gets a distilled prompt (no re-reading the big references).
 *
 * args (built by the orchestrator):
 *   { field, segment, segmentLabel, idPrefix, contract, exampleLesson,
 *     units: [{ unitId, unitShort, unitLabel, draftPath, isLandmark, lessons:[{title,coverage}] }] }
 */

export const meta = {
  name: 'codex-author-segment',
  description: 'Author + adversarially fact-check one Field Codex segment, one unit per lane (Sonnet default, Opus on escalation)',
  phases: [
    { title: 'Draft', detail: 'one author per unit — Sonnet 5, high effort' },
    { title: 'Check', detail: 'per-unit error hunt — Sonnet 5, high effort' },
    { title: 'Verify', detail: 'batched adversarial verify of HIGH findings — Sonnet 5, medium', model: 'sonnet' },
    { title: 'Fix', detail: 'apply survivors — Sonnet 5, low; Opus re-author on escalation' },
  ],
}

const MAX_ROUNDS = 3
const AGENT = 'general-purpose' // full tools: Read/Write/Edit + WebSearch for citation checks

// `args` can arrive as a parsed object OR a JSON string (a known Workflow-tool
// footgun); accept either so the run never dies at launch on `A.units`.
const A = typeof args === 'string' ? JSON.parse(args) : (args || {})

const CHECK_SCHEMA = {
  type: 'object',
  required: ['findings'],
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'severity', 'where', 'problem', 'correction'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          severity: { enum: ['HIGH', 'MED', 'LOW'] },
          where: { type: 'string' },
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

function authorPrompt(unit) {
  return `You are authoring ONE unit of the "${A.segmentLabel}" segment of the "${A.field}" Field Codex track. Write REAL, substantive AP / advanced-high-school science — mechanisms, named studies, numbers, history, competing views — NOT dictionary definitions. Depth is the whole point.

TYPED SHAPE — author DIRECTLY into this literal (never prose-first-then-convert, which drops answer keys):
${A.contract}

ONE EXAMPLE LESSON (shape reference ONLY — do not reuse its content or topic):
${A.exampleLesson}

YOUR UNIT: ${unit.unitLabel}  (unit id: ${unit.unitId})${unit.isLandmark ? '\nThis is the LANDMARK WORK & OPEN DEBATES unit — name real studies, researchers, dates, and the ACTUAL controversy, accurately.' : ''}
Author exactly these ${unit.lessons.length} lessons:
${unit.lessons.map((l, i) => `  ${i + 1}. ${l.title} — ${l.coverage}`).join('\n')}

RULES:
- Each lesson: 2–4 sections totaling ~400–500 words of substantive prose, a concrete ~100–150 word workedExample, an ~80–120 word judgeFraming tied to THAT concept (why a fair judge probes it), readingMinutes 4–6, and a 3–5 question checkpoint mixing mc / ordering / matching.
- Every MC option (INCLUDING the correct one) needs an explanation; ordering needs a complete correctOrder (a permutation of every item id); matching needs correctPairs covering every left id exactly once.
- Use DOUBLE-quoted strings for EVERY string value (JSON-style), escaping any interior double quote. NEVER single-quote strings — an apostrophe in prose (e.g. "Sony's", "Bekesy's") silently terminates a single-quoted string and corrupts the whole file.
- Prefix EVERY lesson id with "${A.idPrefix}-${unit.unitShort}-" so ids are globally unique across the library.
- Get the SCIENCE RIGHT: correct numbers, units, and correctly-keyed answers. A mis-keyed checkpoint teaches something false. Use WebSearch to confirm any named study / researcher / date / figure you are not certain of.

Write the unit as a self-contained typed \`Unit\` object literal with \`export default unit\` to ${unit.draftPath} using the Write tool. Then return { unitId: "${unit.unitId}", wrote: true, lessonCount }.`
}

function checkPrompt(unit) {
  return `Adversarially fact-check the Field Codex unit draft at ${unit.draftPath}. Your ONLY job is to find errors — do NOT edit the file. Read it and every lesson + checkpoint, then flag:
- HIGH — any answer key (answerId / correctOrder / correctPairs) inconsistent with its explanation or the science (a wrong key is auto-HIGH); any named study / researcher / date / figure that is misattributed, wrong, or FABRICATED (verify with WebSearch; a fabricated citation is HIGH).
- MED — a scientifically overstated or imprecise claim in prose or workedExample; a judgeFraming that is generic filler not tied to its concept.
- LOW — minor phrasing / typos.
Return findings: [{ id, severity, where (lesson id + which field), problem, correction }]. If the unit is clean, return an empty findings array.`
}

function refutePrompt(unit, highs) {
  return `You are the DEFENSE. Below are HIGH-severity fact-check findings against the unit draft at ${unit.draftPath}. For EACH finding, try hard to REFUTE it — show the draft was actually CORRECT and the finding is a checker hallucination. Read the relevant lesson in the file and verify with WebSearch.
Findings:
${JSON.stringify(highs, null, 2)}
Return verdicts: [{ findingId, refuted (true ONLY if you clearly showed the draft was right), correctionAccurate (set false — not your lens), note }]. Default refuted:false when unsure.`
}

function auditPrompt(unit, highs) {
  return `You are the CORRECTIONS AUDITOR. For each HIGH finding against ${unit.draftPath}, judge whether the finding's proposed CORRECTION is itself accurate — do not trust it blindly; verify the corrected claim / key with WebSearch.
Findings:
${JSON.stringify(highs, null, 2)}
Return verdicts: [{ findingId, refuted (set false — not your lens), correctionAccurate (true if the correction is right), note (the right fix if the correction is wrong) }].`
}

function fixPrompt(unit, toApply) {
  return `Apply these fact-check corrections to the unit draft at ${unit.draftPath} by editing the file (Edit/Write). Make the minimal correct change per finding — fix the claim, number, unit, answer key, or judgeFraming — and preserve the typed shape and all lesson ids exactly. Where an auditor note says the proposed correction is wrong, derive the correct fix yourself (verify with WebSearch).
Findings to apply:
${JSON.stringify(toApply, null, 2)}
Return a one-line summary of what changed.`
}

function reauthorPrompt(unit, survivingHigh) {
  return `The unit draft at ${unit.draftPath} STILL has HIGH-severity factual errors after fixes. Re-author the affected lessons correctly. Read the file, fix every listed error at the root (rewrite the lesson prose and/or checkpoint as needed; get the science and answer keys right; verify named studies with WebSearch), and keep the typed shape and existing lesson ids.
Unresolved HIGH findings:
${JSON.stringify(survivingHigh, null, 2)}
Return { unitId: "${unit.unitId}", wrote: true, lessonCount }.`
}

async function authorAndVerifyUnit(unit) {
  await agent(authorPrompt(unit), {
    agentType: AGENT, model: 'sonnet', effort: 'high', phase: 'Draft',
    label: `author:${unit.unitShort}`, schema: AUTHOR_SCHEMA,
  })

  let openHigh = []
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const check = await agent(checkPrompt(unit), {
      agentType: AGENT, model: 'sonnet', effort: 'high', phase: 'Check',
      label: `check:${unit.unitShort}#${round}`, schema: CHECK_SCHEMA,
    })
    const findings = check?.findings ?? []
    const highs = findings.filter((f) => f.severity === 'HIGH')
    const others = findings.filter((f) => f.severity !== 'HIGH')

    // Adversarial verify ONLY for HIGH findings, batched to 2 lenses per unit.
    let survivingHigh = highs
    let auditVerdicts = []
    if (highs.length > 0) {
      const [refute, audit] = await parallel([
        () => agent(refutePrompt(unit, highs), {
          agentType: AGENT, model: 'sonnet', effort: 'medium', phase: 'Verify',
          label: `refute:${unit.unitShort}#${round}`, schema: VERDICTS_SCHEMA,
        }),
        () => agent(auditPrompt(unit, highs), {
          agentType: AGENT, model: 'sonnet', effort: 'medium', phase: 'Verify',
          label: `audit:${unit.unitShort}#${round}`, schema: VERDICTS_SCHEMA,
        }),
      ])
      const refuted = new Set((refute?.verdicts ?? []).filter((v) => v.refuted === true).map((v) => v.findingId))
      auditVerdicts = audit?.verdicts ?? []
      // A HIGH finding survives unless the defense clearly refuted it (draft was right).
      survivingHigh = highs.filter((f) => !refuted.has(f.id))
    }

    const toApply = [...survivingHigh, ...others]
    if (toApply.length === 0) {
      return { unitId: unit.unitId, draftPath: unit.draftPath, rounds: round, clean: true, openHigh: [] }
    }

    // Attach auditor notes so the fixer knows which corrections to distrust.
    const enriched = toApply.map((f) => {
      const a = auditVerdicts.find((v) => v.findingId === f.id)
      return a && a.correctionAccurate === false ? { ...f, auditorNote: a.note } : f
    })
    await agent(fixPrompt(unit, enriched), {
      agentType: AGENT, model: 'sonnet', effort: 'low', phase: 'Fix',
      label: `fix:${unit.unitShort}#${round}`,
    })

    // Ship once nothing BLOCKING remains (no HIGH, no MED). Residual LOW nitpicks
    // were just applied by the fix above and don't justify another full round —
    // otherwise a checker's endless minor phrasing notes burn every round.
    const blocking = survivingHigh.length + others.filter((f) => f.severity === 'MED').length
    if (blocking === 0) {
      return { unitId: unit.unitId, draftPath: unit.draftPath, rounds: round, clean: true, openHigh: [] }
    }

    // Escalate to Opus when HIGH errors persist past the first fix round.
    if (survivingHigh.length > 0 && round >= 2 && round < MAX_ROUNDS) {
      log(`↑ ${unit.unitShort}: HIGH errors persisted — escalating to an Opus re-author`)
      await agent(reauthorPrompt(unit, survivingHigh), {
        agentType: AGENT, model: 'opus', effort: 'high', phase: 'Draft',
        label: `opus-reauthor:${unit.unitShort}`, schema: AUTHOR_SCHEMA,
      })
    }
    openHigh = survivingHigh
  }

  // A HIGH found on the FINAL round gets a fix applied but no confirming re-check
  // inside the loop, so it would be reported "open" even when the fix resolved it.
  // Re-check once here so `openHigh` reflects the file's true final state.
  if (openHigh.length > 0) {
    const finalCheck = await agent(checkPrompt(unit), {
      agentType: AGENT, model: 'sonnet', effort: 'high', phase: 'Check',
      label: `recheck:${unit.unitShort}`, schema: CHECK_SCHEMA,
    })
    openHigh = (finalCheck?.findings ?? []).filter((f) => f.severity === 'HIGH')
  }

  return { unitId: unit.unitId, draftPath: unit.draftPath, rounds: MAX_ROUNDS, clean: openHigh.length === 0, openHigh }
}

log(`Authoring "${A.segmentLabel}" of ${A.field}: ${A.units.length} units, one lane each (Sonnet default, Opus on escalation).`)
const results = (await parallel(A.units.map((u) => () => authorAndVerifyUnit(u)))).filter(Boolean)

const dirty = results.filter((r) => !r.clean)
log(`Done: ${results.length} units, ${results.filter((r) => r.clean).length} clean${dirty.length ? `, ${dirty.length} with open HIGH findings: ${dirty.map((r) => r.unitId).join(', ')}` : ''}.`)

return { results, allClean: dirty.length === 0 }
