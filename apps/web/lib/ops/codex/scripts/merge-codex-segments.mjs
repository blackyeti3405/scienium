// @ts-check
/**
 * Field Codex segment merger — the deterministic half of `/codex-pipeline`.
 *
 * The authoring workflow (`.claude/codex-pipeline/author-field.workflow.mjs`)
 * fans out one agent per UNIT, each writing a single typed `Unit` as JSON to
 * `.claude/codex-pipeline/drafts/`. Assembling those drafts into
 * `content/<slug>.json` and keeping the registries in sync is pure mechanical
 * work with no judgment in it — so no agent should be doing it. Before this
 * script existed, a Sonnet agent hand-merged into a 3.5MB / 45,000-line JSON
 * (~900K tokens of chunked reads for one append) and hand-edited four registry
 * blocks across three files, which is where the "new track means THREE
 * registries" footgun came from. This script does both for zero tokens.
 *
 * It also VALIDATES every draft before assembly, mirroring the zod `TrackSchema`
 * (`__tests__/track-schema.ts`) and the invariants in `content-shape.test.ts`.
 * Those gates run at the very end of a pipeline run, long after the authoring
 * agents are gone; catching a mis-keyed checkpoint here instead names the exact
 * draft file while it's still cheap to re-author one unit.
 *
 * Usage:
 *   node merge-codex-segments.mjs --plan <plan.json> [--keep-drafts] [--dry-run]
 *
 * Run via `pnpm --filter web codex:merge -- --plan <plan.json>`.
 *
 * The plan (written by the pipeline orchestrator from the workflow's return).
 * Each LESSON is its own draft file; the unit's id/label come from the plan:
 *   {
 *     "slug": "ecology", "label": "Ecology", "home": false,
 *     "labType": "biocore",                       // optional; only when home
 *     "segments": [
 *       { "id": "core", "kind": "core", "label": "Core",
 *         "units": [
 *           { "id": "eco-core-what", "label": "What Ecology Studies",
 *             "lessons": [{ "id": "eco-core-what-niche", "path": "<repo-relative>.json" }] }
 *         ] },
 *       { "id": "population-ecology", "kind": "branch", "label": "Population Ecology",
 *         "units": [...] }
 *     ]
 *   }
 *
 * Merge semantics: a `core` segment REPLACES the track's core; a `branch`
 * segment upserts into `branches[]` by id (replacing in place, else appending).
 * A plan may carry any subset of a field's 6 segments, so the same script serves
 * a whole-field run, a single `--branch`, and a `--deepen`.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync, rmdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'

const codexDir = fileURLToPath(new URL('../', import.meta.url))
const scriptsDir = `${codexDir}scripts/`
const contentDir = `${codexDir}content/`
const indexPath = `${codexDir}index.ts`
const shapeTestPath = `${codexDir}__tests__/content-shape.test.ts`
const generatedTestPath = `${codexDir}__tests__/generated-content.test.ts`
// apps/web/lib/ops/codex/ → repo root. Draft paths in the plan are repo-relative
// so they read the same in the plan, the workflow, and the command.
const repoRoot = resolve(codexDir, '../../../../../')

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

// ─── args ────────────────────────────────────────────────────────────────────

function parseArgs() {
  const argv = process.argv.slice(2)
  const planIdx = argv.indexOf('--plan')
  if (planIdx === -1 || !argv[planIdx + 1]) {
    console.error('usage: node merge-codex-segments.mjs --plan <plan.json> [--keep-drafts] [--dry-run]')
    process.exit(1)
  }
  return {
    planPath: resolve(process.cwd(), argv[planIdx + 1]),
    keepDrafts: argv.includes('--keep-drafts'),
    dryRun: argv.includes('--dry-run'),
  }
}

// ─── draft validation ────────────────────────────────────────────────────────
// Mirrors the zod TrackSchema (strict — unknown keys are a real defect, since a
// typo'd key silently drops the value) plus content-shape.test.ts's semantic
// invariants. Every problem is collected so one run reports every bad draft,
// rather than making the caller re-run per error.

/** @param {Record<string, unknown>} obj @param {string[]} allowed @param {string} where @param {string[]} problems */
function checkKeys(obj, allowed, where, problems) {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) problems.push(`${where}: unknown key "${k}" (allowed: ${allowed.join(', ')})`)
  }
  for (const k of allowed) {
    if (!(k in obj)) problems.push(`${where}: missing required key "${k}"`)
  }
}

/** @param {any} q @param {string} where @param {string[]} problems */
function validateQuestion(q, where, problems) {
  if (!q || typeof q !== 'object') {
    problems.push(`${where}: question is not an object`)
    return
  }
  const at = `${where} question "${q.id ?? '?'}"`
  if (typeof q.id !== 'string' || !q.id) problems.push(`${at}: needs a non-empty string id`)
  if (typeof q.prompt !== 'string' || !q.prompt.trim()) problems.push(`${at}: needs a non-empty prompt`)

  if (q.kind === 'mc') {
    checkKeys(q, ['kind', 'id', 'prompt', 'options', 'answerId', 'explanations'], at, problems)
    const ids = Array.isArray(q.options) ? q.options.map((/** @type {any} */ o) => o?.id) : []
    if (ids.length < 2) problems.push(`${at}: needs at least 2 options`)
    if (new Set(ids).size !== ids.length) problems.push(`${at}: duplicate option ids`)
    if (!ids.includes(q.answerId)) {
      problems.push(`${at}: answerId "${q.answerId}" is not one of the option ids [${ids.join(', ')}] — the answer key is broken`)
    }
    // Every option needs an explanation INCLUDING the correct one — the grading
    // UI reads it on any wrong pick, and content-shape.test.ts asserts the map
    // is complete.
    for (const id of ids) {
      if (typeof q.explanations?.[id] !== 'string' || !q.explanations[id].trim()) {
        problems.push(`${at}: option "${id}" has no explanation`)
      }
    }
    for (const id of Object.keys(q.explanations ?? {})) {
      if (!ids.includes(id)) problems.push(`${at}: explanations has key "${id}" with no matching option`)
    }
  } else if (q.kind === 'ordering') {
    checkKeys(q, ['kind', 'id', 'prompt', 'items', 'correctOrder', 'explanation'], at, problems)
    const ids = Array.isArray(q.items) ? q.items.map((/** @type {any} */ i) => i?.id) : []
    const order = Array.isArray(q.correctOrder) ? q.correctOrder : []
    if (ids.length < 2) problems.push(`${at}: needs at least 2 items`)
    // correctOrder must be a permutation of the item ids — a dropped or
    // duplicated id makes the question ungradeable.
    if ([...ids].sort().join('|') !== [...order].sort().join('|')) {
      problems.push(`${at}: correctOrder [${order.join(', ')}] is not a permutation of the item ids [${ids.join(', ')}]`)
    }
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) problems.push(`${at}: needs a non-empty explanation`)
  } else if (q.kind === 'matching') {
    checkKeys(q, ['kind', 'id', 'prompt', 'left', 'right', 'correctPairs', 'explanation'], at, problems)
    const leftIds = Array.isArray(q.left) ? q.left.map((/** @type {any} */ l) => l?.id) : []
    const rightIds = Array.isArray(q.right) ? q.right.map((/** @type {any} */ r) => r?.id) : []
    const pairs = Array.isArray(q.correctPairs) ? q.correctPairs : []
    const paired = pairs.map((/** @type {any} */ p) => p?.[0])
    if (leftIds.length < 2) problems.push(`${at}: needs at least 2 left items`)
    if ([...leftIds].sort().join('|') !== [...paired].sort().join('|')) {
      problems.push(`${at}: correctPairs must cover every left id exactly once (left: [${leftIds.join(', ')}], paired: [${paired.join(', ')}])`)
    }
    for (const p of pairs) {
      if (!Array.isArray(p) || p.length !== 2) {
        problems.push(`${at}: every correctPairs entry must be a [leftId, rightId] tuple`)
      } else if (!rightIds.includes(p[1])) {
        problems.push(`${at}: correctPairs maps "${p[0]}" to "${p[1]}", which is not a right-side id`)
      }
    }
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) problems.push(`${at}: needs a non-empty explanation`)
  } else {
    problems.push(`${at}: kind must be "mc" | "ordering" | "matching" (got ${JSON.stringify(q.kind)})`)
  }
}

/** @param {any} lesson @param {string} where @param {string[]} problems */
function validateLesson(lesson, where, problems) {
  if (!lesson || typeof lesson !== 'object') {
    problems.push(`${where}: lesson is not an object`)
    return
  }
  const at = `${where} lesson "${lesson.id ?? '?'}"`
  checkKeys(lesson, ['id', 'label', 'readingMinutes', 'sections', 'workedExample', 'judgeFraming', 'checkpoint'], at, problems)

  // Slug-safety + GLOBAL uniqueness (checked in main() against this run and every
  // shipped track) are the real invariants — the same ones content-shape.test.ts
  // gates on. The `<field-short>-<segment>-` id convention that gets there is an
  // authoring instruction in the workflow's prompts, deliberately NOT enforced
  // here: shipped fields legitimately use abbreviations (`cmp-core-`,
  // `clinpharm-cardio-`, `gaitcore-`) rather than their full slug, so a prefix
  // rule would reject the existing library while adding nothing uniqueness
  // doesn't already prove.
  if (typeof lesson.id !== 'string' || !SLUG_RE.test(lesson.id)) {
    problems.push(`${at}: id must be slug-safe (lowercase, digits, single hyphens)`)
  }
  if (typeof lesson.label !== 'string' || !lesson.label.trim()) problems.push(`${at}: needs a non-empty label`)
  if (typeof lesson.readingMinutes !== 'number') problems.push(`${at}: readingMinutes must be a number`)
  if (!Array.isArray(lesson.sections) || lesson.sections.length === 0) {
    problems.push(`${at}: needs at least one section`)
  } else {
    lesson.sections.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
      checkKeys(s ?? {}, ['heading', 'body'], `${at} section ${i + 1}`, problems)
      if (!s?.body?.trim()) problems.push(`${at} section ${i + 1}: empty body`)
    })
  }
  if (typeof lesson.workedExample !== 'string' || !lesson.workedExample.trim()) problems.push(`${at}: needs a workedExample`)
  if (typeof lesson.judgeFraming !== 'string' || !lesson.judgeFraming.trim()) problems.push(`${at}: needs a judgeFraming`)

  const questions = lesson.checkpoint?.questions
  if (!Array.isArray(questions)) {
    problems.push(`${at}: checkpoint.questions must be an array`)
    return
  }
  checkKeys(lesson.checkpoint, ['questions'], `${at} checkpoint`, problems)
  if (questions.length < 3 || questions.length > 5) {
    problems.push(`${at}: checkpoint has ${questions.length} questions — must be 3-5`)
  }
  const qIds = questions.map((/** @type {any} */ q) => q?.id)
  if (new Set(qIds).size !== qIds.length) problems.push(`${at}: duplicate question ids within the checkpoint`)
  for (const q of questions) validateQuestion(q, at, problems)
}

/**
 * Read + validate one unit's lessons. Each lesson is its own draft file (the
 * authoring agents write one file per lesson — a whole-unit write is ~65KB in a
 * single tool call and drops the connection mid-response). The unit's `id` and
 * `label` come from the plan, not from any draft.
 * @param {any} planUnit @param {string} segId @param {string[]} problems @param {string[]} consumed
 */
function readUnit(planUnit, segId, problems, consumed) {
  const at = `segment "${segId}" unit "${planUnit.id}"`
  if (typeof planUnit.id !== 'string' || !SLUG_RE.test(planUnit.id)) problems.push(`${at}: unit id must be slug-safe`)
  if (typeof planUnit.label !== 'string' || !planUnit.label.trim()) problems.push(`${at}: unit needs a non-empty label`)
  if (!Array.isArray(planUnit.lessons) || planUnit.lessons.length === 0) {
    problems.push(`${at}: plan lists no lessons`)
    return null
  }

  /** @type {any[]} */
  const lessons = []
  for (const pl of planUnit.lessons) {
    const abs = resolve(repoRoot, pl.path)
    if (!existsSync(abs)) {
      // The plan names every file the authors were told to write, so a lesson
      // lost to a dropped connection surfaces here by name instead of silently
      // shortening the unit.
      problems.push(`${at}: lesson draft not found at ${pl.path} (expected id "${pl.id}")`)
      continue
    }
    let lesson
    try {
      lesson = JSON.parse(readFileSync(abs, 'utf8'))
    } catch (err) {
      problems.push(`${pl.path}: invalid JSON — ${err.message}`)
      continue
    }
    validateLesson(lesson, pl.path, problems)
    if (lesson?.id && pl.id && lesson.id !== pl.id) {
      problems.push(`${pl.path}: lesson id "${lesson.id}" does not match the plan's "${pl.id}"`)
    }
    lessons.push(lesson)
    consumed.push(abs)
  }
  if (lessons.length === 0) {
    problems.push(`${at}: no usable lesson drafts`)
    return null
  }
  return { id: planUnit.id, label: planUnit.label, lessons }
}

// ─── registry codegen ────────────────────────────────────────────────────────
// index.ts's CODEX_TRACKS + LOADERS and the two test module maps are all
// mechanically derivable from content/*.json, so they are regenerated wholesale
// on every merge rather than hand-edited. That's what retires the "a NEW track
// means THREE registries" footgun — drift is now impossible by construction.

/** `acoustics-sound` → `acousticsSound` */
function camel(slug) {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}

/** @param {any} track */
function lessonCount(track) {
  return [track.core, ...track.branches].reduce(
    (n, seg) => n + seg.units.reduce((m, u) => m + u.lessons.length, 0),
    0,
  )
}

/**
 * Replace the body of a `<anchor> ... <closer>` block, where the closer is the
 * first line at column 0 that is exactly `]` or `}`. Fails loudly rather than
 * writing a corrupted file if the anchor moved.
 * @param {string} source @param {string} anchor @param {string} closer @param {string} body @param {string} file
 */
function replaceBlock(source, anchor, closer, body, file) {
  const start = source.indexOf(anchor)
  if (start === -1) throw new Error(`${file}: could not find anchor \`${anchor}\` — the registry codegen in merge-codex-segments.mjs needs updating`)
  const bodyStart = start + anchor.length
  const end = source.indexOf(`\n${closer}`, bodyStart)
  if (end === -1) throw new Error(`${file}: could not find the \`${closer}\` closing \`${anchor}\``)
  return `${source.slice(0, bodyStart)}\n${body}${source.slice(end)}`
}

/** @param {{slug:string,track:any}[]} tracks */
function syncIndex(tracks) {
  let src = readFileSync(indexPath, 'utf8')

  const summaries = tracks
    .map(({ slug, track }) => {
      return `  { slug: '${slug}', label: '${track.label}', branchCount: ${track.branches.length}, lessonCount: ${lessonCount(track)} },`
    })
    .join('\n')
  src = replaceBlock(src, 'export const CODEX_TRACKS: CodexTrackSummary[] = [', ']', summaries, 'index.ts')

  const loaders = tracks.map(({ slug }) => `  '${slug}': () => import('./tracks/${slug}'),`).join('\n')
  src = replaceBlock(src, "const LOADERS: Record<CodexTrackSlug, () => Promise<{ default: CodexTrack }>> = {", '}', loaders, 'index.ts')

  return src
}

/**
 * Rewrite a test's `import x from '../tracks/y'` run + its module map. Both
 * tests statically import every track so the checks run against real on-disk
 * content, which means both need an entry per field.
 * @param {string} path @param {string} mapAnchor @param {{slug:string}[]} tracks
 */
function syncTestRegistry(path, mapAnchor, tracks) {
  let src = readFileSync(path, 'utf8')

  const importRe = /^import \w+ from '\.\.\/tracks\/[a-z0-9-]+'\n(?:import \w+ from '\.\.\/tracks\/[a-z0-9-]+'\n)*/m
  if (!importRe.test(src)) throw new Error(`${path}: could not find the '../tracks/*' import block — the registry codegen needs updating`)
  const imports = tracks.map(({ slug }) => `import ${camel(slug)} from '../tracks/${slug}'`).join('\n') + '\n'
  src = src.replace(importRe, imports)

  const entries = tracks.map(({ slug }) => `  '${slug}': ${camel(slug)},`).join('\n')
  src = replaceBlock(src, mapAnchor, '}', entries, path)

  return src
}

// ─── merge ───────────────────────────────────────────────────────────────────

function main() {
  const { planPath, keepDrafts, dryRun } = parseArgs()
  if (!existsSync(planPath)) {
    console.error(`plan not found: ${planPath}`)
    process.exit(1)
  }
  const plan = JSON.parse(readFileSync(planPath, 'utf8'))

  if (!plan.slug || !SLUG_RE.test(plan.slug)) {
    console.error(`plan.slug "${plan.slug}" is missing or not slug-safe`)
    process.exit(1)
  }
  if (!Array.isArray(plan.segments) || plan.segments.length === 0) {
    console.error('plan.segments must be a non-empty array')
    process.exit(1)
  }

  /** @type {string[]} */
  const problems = []
  /** @type {string[]} */
  const consumed = []
  /** @type {any[]} */
  const assembled = []

  for (const seg of plan.segments) {
    if (seg.kind !== 'core' && seg.kind !== 'branch') {
      problems.push(`segment "${seg.id}": kind must be "core" or "branch"`)
      continue
    }
    /** @type {any[]} */
    const units = []
    for (const u of seg.units ?? []) {
      const unit = readUnit(u, seg.id, problems, consumed)
      if (unit) units.push(unit)
    }
    if (units.length === 0) problems.push(`segment "${seg.id}": no usable unit drafts`)
    assembled.push({ id: seg.id, kind: seg.kind, label: seg.label, units })
  }

  // Lesson ids must be globally unique across the whole library, so check the
  // incoming segments against each other AND against every already-shipped track.
  /** @type {Map<string, string>} */
  const seenIds = new Map()
  for (const seg of assembled) {
    for (const u of seg.units) {
      for (const l of u.lessons ?? []) {
        if (typeof l?.id !== 'string') continue
        if (seenIds.has(l.id)) problems.push(`duplicate lesson id "${l.id}" (also in ${seenIds.get(l.id)})`)
        else seenIds.set(l.id, seg.id)
      }
    }
  }
  const incomingSegmentIds = new Set(assembled.map((s) => s.id))
  for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.json') && !f.startsWith('.'))) {
    const otherSlug = file.replace(/\.json$/, '')
    const other = JSON.parse(readFileSync(`${contentDir}${file}`, 'utf8'))
    for (const seg of [other.core, ...other.branches]) {
      // Skip segments this run replaces — their old ids are about to be gone.
      if (otherSlug === plan.slug && incomingSegmentIds.has(seg.id)) continue
      for (const u of seg.units) {
        for (const l of u.lessons) {
          if (seenIds.has(l.id)) problems.push(`lesson id "${l.id}" already exists in the shipped track ${otherSlug} (${seg.id})`)
        }
      }
    }
  }

  if (problems.length) {
    console.error(`codex:merge failed — ${problems.length} problem(s) in the drafts:\n`)
    for (const p of problems) console.error(`  - ${p}`)
    console.error('\nNo content was written. Re-author the named unit draft(s) and re-run.')
    process.exit(1)
  }

  // Upsert into the track: core replaces core, branches upsert by id.
  const trackPath = `${contentDir}${plan.slug}.json`
  /** @type {any} */
  let track
  if (existsSync(trackPath)) {
    track = JSON.parse(readFileSync(trackPath, 'utf8'))
    if (plan.label) track.label = plan.label
  } else {
    const core = assembled.find((s) => s.kind === 'core')
    if (!core) {
      console.error(`content/${plan.slug}.json does not exist yet, so this plan must include the core segment (a branch cannot be the first segment of a new field).`)
      process.exit(1)
    }
    track = { slug: plan.slug, label: plan.label ?? plan.slug, core: null, branches: [] }
  }

  /** @type {string[]} */
  const applied = []
  for (const seg of assembled) {
    if (seg.kind === 'core') {
      track.core = seg
      applied.push(`core (${seg.units.length} units, ${seg.units.reduce((n, u) => n + u.lessons.length, 0)} lessons)`)
    } else {
      const at = track.branches.findIndex((/** @type {any} */ b) => b.id === seg.id)
      if (at === -1) track.branches.push(seg)
      else track.branches[at] = seg
      applied.push(`${at === -1 ? 'branch' : 'branch (replaced)'} ${seg.id} (${seg.units.length} units, ${seg.units.reduce((n, u) => n + u.lessons.length, 0)} lessons)`)
    }
  }

  if (dryRun) {
    console.log(`codex:merge --dry-run — drafts valid. Would apply to ${plan.slug}:`)
    for (const a of applied) console.log(`  - ${a}`)
    console.log(`  total after merge: ${track.branches.length} branches, ${lessonCount(track)} lessons`)
    return
  }

  writeFileSync(trackPath, JSON.stringify(track, null, 2) + '\n', 'utf8')
  console.log(`wrote content/${plan.slug}.json`)
  for (const a of applied) console.log(`  - ${a}`)

  // Regenerate every registry from content/ — including this field's, whether
  // it is new or not.
  const tracks = readdirSync(contentDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
    .map((slug) => ({ slug, track: JSON.parse(readFileSync(`${contentDir}${slug}.json`, 'utf8')) }))

  writeFileSync(indexPath, syncIndex(tracks), 'utf8')
  writeFileSync(shapeTestPath, syncTestRegistry(shapeTestPath, 'const ALL_TRACK_MODULES: Record<string, CodexTrack> = {', tracks), 'utf8')
  writeFileSync(generatedTestPath, syncTestRegistry(generatedTestPath, 'const WRAPPERS: Record<string, CodexTrack> = {', tracks), 'utf8')
  console.log(`synced registries for ${tracks.length} track(s): index.ts, content-shape.test.ts, generated-content.test.ts`)

  // Generate the wrapper + checksums for the merged content.
  execFileSync(process.execPath, [`${scriptsDir}build-codex-tracks.mjs`], { stdio: 'inherit' })

  if (!keepDrafts) {
    for (const d of consumed) unlinkSync(d)
    // Each unit's lessons live in their own directory — sweep the now-empty
    // shells too, so `drafts/` is genuinely clean between runs.
    for (const dir of new Set(consumed.map((d) => dirname(d)))) {
      if (existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir)
    }
    console.log(`removed ${consumed.length} consumed draft(s)`)
  }

  console.log(`codex:merge done — ${plan.slug}: ${track.branches.length} branches, ${lessonCount(track)} lessons.`)
}

main()
