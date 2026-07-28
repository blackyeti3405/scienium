import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { AI_MODELS } from '@/lib/ai/models'

/**
 * Cost-shape invariants for every paid route, in ONE table.
 *
 * ## Why these live here and not in the Playwright suite
 *
 * They used to be `test('AC13 (static): …')` cases scattered through six spec
 * files, reading route source with `readFileSync` inside a browser test. That
 * was wrong twice over. They need no browser, so they cost a 30-minute
 * authenticated serial suite's attention for something a file read answers in
 * a millisecond — and, far worse, **a spec that is not run cannot fail**:
 * `synthesis-matrix.spec.ts` AC14 pinned `anthropic().messages.create(`, v0.45.0
 * moved every call behind the `aiCreate` registry door, and the assertion
 * matched ZERO call sites and reported a failure to nobody for five versions.
 *
 * Here they run in gate 3, on every commit, in milliseconds.
 *
 * `paid-work-guard.test.ts` answers a different question — "is this route
 * guarded at all" — with a directory sweep. This one answers "does this
 * specific paid call still have the cost shape it was designed with": how many
 * provider calls, which registry operation, which cache prefix.
 *
 * ## The completeness guard
 *
 * `every paid module is accounted for` fails when a new file starts calling
 * `aiCreate`/`aiStream` without an entry below. A table nobody is forced to
 * extend rots the same way the E2E assertions did.
 */

const WEB_ROOT = join(__dirname, '..')

const read = (rel: string) => readFileSync(join(WEB_ROOT, rel), 'utf8')

/**
 * Strip comments before matching. Several of these files document the very
 * invariant being asserted, quoting the pattern verbatim in a JSDoc block —
 * which would otherwise count as an extra call site.
 */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

interface CostShape {
  /** Repo-relative path of the module that owns the provider call. */
  file: string
  /** Registry operation names this module may buy. */
  operations: string[]
  /** How many `aiCreate(`/`aiStream(` call sites the module should contain. */
  callSites: number
  /** Expected `cache_control: { type: 'ephemeral' }` blocks. */
  cacheBlocks: number
  /** Substrings that must NOT appear (usually a cache prefix to stay out of). */
  forbid?: string[]
  /** Substrings that must appear. */
  require?: string[]
  /** The operation is a parameter, not a literal — see `grading.ts`. */
  dynamicOperation?: boolean
  /**
   * Rate tier the ROUTE must enforce. Only set on route files: a lib module has
   * no request to limit, and its caller carries the tier.
   */
  tier?: 'ai' | 'upload'
}

/**
 * One row per module that spends money. `operations` are checked against the
 * model registry, so a typo'd operation name fails here rather than at runtime.
 */
const COST_SHAPES: CostShape[] = [
  {
    // The synthesis check reads ABSTRACTS on its own cache prefix and must never
    // touch the single-paper PERF-8 prefix that quiz/chat/grade/retry share —
    // mixing them would invalidate a ~30k-token cached block on every check.
    file: 'app/api/literature/synthesis/[id]/check/route.ts',
    tier: 'ai',
    operations: ['synthesis_check'],
    callSites: 1,
    cacheBlocks: 1,
    forbid: ['paperTextBlock', 'paperTextContext', 'PAPER_TEXT_SLICE_CHARS'],
  },
  {
    // GENERATION only. Grading goes through the shared `gradeAnswers` in
    // lib/literature/grading.ts — the split is deliberate (P1-S3 put one owner
    // on the parse-and-score path) and a second call site here would mean the
    // clone came back.
    file: 'app/api/papers/[id]/quiz/route.ts',
    tier: 'ai',
    operations: ['quiz_generate'],
    callSites: 1,
    cacheBlocks: 0,
    require: ['paperTextBlock'],
  },
  {
    // Likewise generation only; `quiz_retry_grade` is bought by grading.ts.
    file: 'lib/literature/quiz-retry.ts',
    operations: ['quiz_retry_generate'],
    callSites: 1,
    cacheBlocks: 0,
    require: ['paperTextBlock'],
  },
  {
    // THE shared grader: quiz_grade, quiz_retry_grade, explain_grade and
    // expertise_grade all land on this one call, which takes its operation as a
    // parameter — so the registry name is resolved by the caller, not written
    // here. Three cache blocks: the paper prefix, the rubric, and the questions.
    file: 'lib/literature/grading.ts',
    operations: [],
    dynamicOperation: true,
    callSites: 1,
    cacheBlocks: 3,
  },
  {
    // Grades against the SHARED paper prefix, so it must import it rather than
    // build its own — the opposite requirement to the synthesis check.
    file: 'app/api/papers/[id]/explain/route.ts',
    tier: 'ai',
    operations: ['explain_grade'],
    callSites: 1,
    cacheBlocks: 0,
    require: ['paperTextBlock'],
  },
  {
    file: 'app/api/papers/[id]/chat/route.ts',
    tier: 'ai',
    operations: ['paper_chat'],
    callSites: 1,
    cacheBlocks: 0,
    require: ['paperTextBlock'],
  },
  {
    // Study-with-Vega caches the PROJECT context block, which is identical
    // across every turn of a session.
    file: 'app/api/ops/vega-study/route.ts',
    tier: 'ai',
    operations: ['vega_study'],
    callSites: 1,
    cacheBlocks: 1,
  },
  {
    file: 'app/api/expertise/route.ts',
    tier: 'ai',
    operations: ['expertise_generate'],
    callSites: 1,
    cacheBlocks: 1,
  },
  {
    // Spends through `grading.ts` (the shared grader) rather than calling
    // `aiCreate` itself, so the completeness sweep below cannot discover it —
    // which is exactly why the row is written by hand. What it is here for is
    // the `tier: 'ai'` cap: this route buys a 3072-token grade and mints
    // 150–1200 KP, and it was the only paid route with no cost-shape entry.
    file: 'app/api/expertise/grade/route.ts',
    tier: 'ai',
    operations: [],
    callSites: 0,
    cacheBlocks: 0,
    require: ["operation: 'expertise_grade'"],
  },
  {
    file: 'app/api/failure-log/[id]/followup/route.ts',
    tier: 'ai',
    operations: ['failure_followup'],
    callSites: 1,
    cacheBlocks: 0,
  },
  {
    file: 'lib/literature/process-paper.ts',
    operations: ['paper_metadata'],
    callSites: 1,
    cacheBlocks: 0,
  },
  {
    // TWO call sites on purpose: single-paper scoring and a batch pass.
    file: 'lib/literature/relevance.ts',
    operations: ['paper_relevance'],
    callSites: 2,
    cacheBlocks: 0,
  },
  {
    // The single largest output budget in the app (8,000 tokens) — the first
    // candidate for a cheaper model, so its shape is worth pinning.
    file: 'lib/literature/vocab-curate.ts',
    operations: ['vocab_curate'],
    callSites: 1,
    cacheBlocks: 0,
  },
  {
    file: 'lib/lab-type/classify.ts',
    operations: ['phase_advance_classify'],
    callSites: 1,
    cacheBlocks: 0,
  },
  {
    file: 'lib/ops/codex/study-plan.ts',
    operations: ['study_plan_tracks'],
    callSites: 1,
    cacheBlocks: 0,
  },
  {
    file: 'lib/research-plan/review-service.ts',
    operations: ['research_plan_review'],
    callSites: 1,
    cacheBlocks: 1,
  },
  {
    file: 'lib/research-plan/idea-check-service.ts',
    operations: ['idea_check'],
    callSites: 1,
    cacheBlocks: 0,
  },
]

/** Modules allowed to touch the provider client without a cost-shape entry. */
const SPEND_DOOR = ['lib/ai/spend.ts']

describe('paid call sites keep their cost shape', () => {
  for (const shape of COST_SHAPES) {
    describe(shape.file, () => {
      const src = code(read(shape.file))

      it('makes exactly the expected number of paid calls', () => {
        const sites = src.match(/\bai(?:Create|Stream)\(/g) ?? []
        expect(sites).toHaveLength(shape.callSites)
      })

      it('buys only its declared registry operations', () => {
        const named = [...src.matchAll(/\bai(?:Create|Stream)\(\s*'([a-z_]+)'/g)].map((m) => m[1]!)
        for (const op of named) {
          expect(shape.operations, `${op} is not declared for ${shape.file}`).toContain(op)
          expect(Object.keys(AI_MODELS), `${op} is not in the model registry`).toContain(op)
        }
        // Every declared operation must still be bought here, or the row is
        // describing a call that has moved somewhere unpinned.
        if (!shape.dynamicOperation) {
          expect(new Set(named)).toEqual(new Set(shape.operations))
        } else {
          expect(named, `${shape.file} declares a dynamic operation`).toEqual([])
        }
      })

      it('never calls the provider client directly', () => {
        // `aiCreate`/`aiStream` are where the kill switch, the spend ledger and
        // the model registry live. A direct client call bypasses all three.
        expect(src).not.toMatch(/anthropic\(\)\.messages\./)
      })

      it('keeps its prompt-cache block count', () => {
        const blocks = src.match(/cache_control:\s*\{\s*type:\s*'ephemeral'\s*\}/g) ?? []
        expect(blocks).toHaveLength(shape.cacheBlocks)
      })

      if (shape.forbid) {
        it('stays off the forbidden cache prefix', () => {
          for (const needle of shape.forbid!) expect(src).not.toContain(needle)
        })
      }

      if (shape.require) {
        it('uses the shared paper cache prefix', () => {
          for (const needle of shape.require!) expect(src).toContain(needle)
        })
      }

      if (shape.tier) {
        it(`enforces the '${shape.tier}' rate tier`, () => {
          // The required cap on an LLM-backed route (fail-closed in production
          // without a shared limiter store — P1-R4).
          expect(src).toMatch(new RegExp(`tier:\\s*'${shape.tier}'`))
        })
      }
    })
  }

  it('every paid module is accounted for', async () => {
    // Ripgrep-free discovery so the guard cannot be defeated by a missing tool.
    const { readdirSync, statSync } = await import('node:fs')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const p = join(dir, entry)
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []
      })

    const spending = [...walk(join(WEB_ROOT, 'app')), ...walk(join(WEB_ROOT, 'lib'))]
      .filter((p) => /\bai(?:Create|Stream)\(/.test(code(readFileSync(p, 'utf8'))))
      .map((p) => p.slice(WEB_ROOT.length + 1))

    // A guard that discovers nothing passes vacuously — exactly how the E2E
    // assertion this replaces stayed green for five versions.
    expect(spending.length, 'the paid-module scan found nothing — the pattern has drifted').
      toBeGreaterThanOrEqual(COST_SHAPES.length)

    const declared = new Set([...COST_SHAPES.map((s) => s.file), ...SPEND_DOOR])
    const undeclared = spending.filter((f) => !declared.has(f))
    expect(
      undeclared,
      'a new module spends money with no cost-shape entry — add it to COST_SHAPES',
    ).toEqual([])
  })
})

describe('rewards never come from the model', () => {
  /**
   * Migrated from `lit-explain-it-back.spec.ts` AC14. The whole point of P1-S3
   * was that model output must not reach the economy; asserting it in a browser
   * suite that takes half an hour to run was the wrong home for it.
   *
   * These are LINT, not proof. A negative regex over source text only catches
   * the literal shape it names — `const award = verdict.accuracy; … kp: {
   * increment: award }` reads nothing like `kp: verdict` and passes here
   * (verified by reverting both routes that way: these stayed green). The
   * executable proof, which runs the route with a maximally generous verdict
   * and asserts the amount written to `teamCurrency`, lives in
   * `test/explain-monotonic.test.ts` and `test/synthesis-stale-check.test.ts`,
   * both under "the award is a server constant, not a function of the verdict".
   */
  it('explain-back writes KP only as its flat constant, never from the verdict', () => {
    const src = code(read('app/api/papers/[id]/explain/route.ts'))
    expect(src).toContain('EXPLAIN_KP_AWARD')
    expect(src).not.toMatch(/kp(_awarded)?\s*[:=]\s*verdict/)
  })

  it('explain-back clamps both model scores', () => {
    const src = code(read('lib/literature/explain.ts'))
    expect(src).toContain('accuracy: clampScore(raw.accuracy)')
    expect(src).toContain('completeness: clampScore(raw.completeness)')
  })

  it('the synthesis check awards a server-chosen flat amount', () => {
    const src = code(read('app/api/literature/synthesis/[id]/check/route.ts'))
    expect(src).toContain('SYNTHESIS_KP_AWARD')
    expect(src).not.toMatch(/kp(_awarded)?\s*[:=]\s*verdict/)
  })
})

describe('modules that must stay free', () => {
  /**
   * Routes whose whole point is that they cost nothing. Each shipped with an
   * explicit "no LLM involved" claim in the spec; without a test, that claim is
   * a comment. `codex/progress` and `codex/complete` are the highest-volume
   * writes in the app — a model call slipping in there is the cheapest way to
   * turn a classroom into a bill.
   */
  const FREE = [
    'app/api/ops/codex/progress/route.ts',
    'app/api/ops/codex/complete/route.ts',
    'app/api/literature/vocab/build/route.ts',
    'app/api/discovery/tree/route.ts',
    // The vocabulary pipeline: extraction, dictionaries, scheduling and every
    // read/review surface stay mechanical — curation is the ONE paid touchpoint.
    // Migrated from `vocab-builder.spec.ts` AC12.
    'app/api/literature/vocab/deck/route.ts',
    'app/api/literature/vocab/review/route.ts',
    'app/api/literature/vocab/cards/[id]/route.ts',
    'lib/literature/vocab.ts',
    'lib/literature/vocab-dictionary.ts',
    'lib/literature/srs.ts',
  ]

  for (const file of FREE) {
    it(`${file} makes no provider call`, () => {
      const src = code(read(file))
      expect(src).not.toMatch(/\bai(?:Create|Stream)\(/)
      expect(src).not.toContain('@anthropic-ai/sdk')
      expect(src).not.toContain("from '@/lib/anthropic'")
      // A paid rate tier on a route with no paid path means somebody expected it
      // to spend. The vocab BUILD route is the deliberate exception: it makes no
      // call itself but delegates one to `vocab-curate`, so it must carry the
      // tier — asserted in its own case below.
      if (file.startsWith('app/') && !file.includes('vocab/build')) {
        expect(src).not.toMatch(/tier:\s*'ai'/)
      }
    })
  }

  it('the quiz-retry ROUTE is a thin adapter with no provider or db access', () => {
    // The workflow lives in the service (Track-B extraction). A route that
    // grows its own client or db import is the clone coming back.
    const src = code(read('app/api/papers/[id]/quiz/retry/route.ts'))
    expect(src).not.toContain('anthropic')
    expect(src).not.toContain("from '@/lib/db'")
  })

  it('the vocab build route delegates its one paid step rather than inlining it', () => {
    // Term EXTRACTION is local computation; only curation is paid. The route
    // must therefore carry the `ai` tier (it can reach a paid call) while the
    // call itself lives in the curate module.
    const src = code(read('app/api/literature/vocab/build/route.ts'))
    expect(src).toMatch(/tier:\s*'ai'/)
    expect(src).toContain("from '@/lib/literature/vocab-curate'")
  })
})
