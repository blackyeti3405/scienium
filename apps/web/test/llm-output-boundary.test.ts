import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

/**
 * The ONE LLM output boundary (REFACTOR2 P2-S9).
 *
 * Before this, every call site read the reply itself and they disagreed. Six
 * dereferenced `content[0].type` — a TypeError the instant the array is empty —
 * the rest used `content[0]?`, which reads a leading `thinking`/`tool_use` block
 * as "no text", and the generic grader accepted ANY non-empty array as a set of
 * grades. Reproduced against the pre-fix code, each of these reached something
 * expensive:
 *
 *   - `content: []` → `TypeError: Cannot read properties of undefined` thrown
 *     out of `classifyLabType` mid phase-advance, AFTER the claim and the spend;
 *   - a leading non-text block → an empty reply persisted as the assistant turn;
 *   - `[null]` from the grader → `graded.map((g) => [g.questionId, g])` threw
 *     while building the grade map, after the paid call;
 *   - `[{ questionId: 'q1', score: '95' }]` → `clampScore` ran `Math.round` on a
 *     string and the value went to `computeQuizAward` and `paperQuizAttempt`;
 *   - `stop_reason: 'max_tokens'` with a parseable prefix → a five-question quiz
 *     graded on one row, silently.
 *
 * These tests pin the ATTACKS, not the shape: each one is a hostile/degenerate
 * provider reply, and each asserts it cannot reach the economy or the database.
 */

const mocks = vi.hoisted(() => ({ aiCreate: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/ai/spend', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  aiCreate: mocks.aiCreate,
}))

import { firstText, parseModelJson, parseModelOutput } from '@/lib/ai/spend'
import { gradeAnswers } from '@/lib/literature/grading'
import { GradedAnswerSchema, aggregateOverQuestions } from '@/lib/literature/quiz'
import { clampScore } from '@/lib/economy'

/** A provider reply, built exactly as the SDK would hand it over. */
const reply = (content: Array<Record<string, unknown>>, stop: string | null = 'end_turn') =>
  ({ content, stop_reason: stop }) as never

const textReply = (text: string, stop: string | null = 'end_turn') =>
  reply([{ type: 'text', text }], stop)

/** A well-formed five-row grading reply, for the positive control. */
const goodGrades = JSON.stringify(
  ['q1', 'q2', 'q3', 'q4', 'q5'].map((id) => ({ questionId: id, score: 80, rationale: 'ok' })),
)

const gradeCall = () =>
  gradeAnswers({
    operation: 'quiz_grade',
    instructions: 'i',
    contextBlock: 'c',
    payload: [],
    promptIntro: 'p',
    maxTokens: 100,
    logLabel: '[quiz]',
    itemSchema: GradedAnswerSchema,
  })

beforeEach(() => vi.clearAllMocks())

describe('firstText — the extraction every call site used to write itself', () => {
  it('an EMPTY content array yields no text instead of throwing', () => {
    // The pre-fix `response.content[0].type` threw here.
    expect(() => firstText(reply([]))).not.toThrow()
    expect(firstText(reply([]))).toBe('')
  })

  it('finds the text block BEHIND a leading thinking/tool_use block', () => {
    const behindThinking = reply([
      { type: 'thinking', thinking: 'deliberating' },
      { type: 'text', text: 'the answer' },
    ])
    // `content[0]?.type === 'text'` read this as '' — the reply was there.
    expect(firstText(behindThinking)).toBe('the answer')
    expect(
      firstText(reply([{ type: 'tool_use', id: 't', name: 'x' }, { type: 'text', text: 'a' }])),
    ).toBe('a')
  })

  it('a text block whose `text` is not a string is not text', () => {
    expect(firstText(reply([{ type: 'text', text: { evil: 1 } }]))).toBe('')
  })
})

describe('parseModelOutput — strict, and truncation-aware', () => {
  const Shape = z.object({ verdict: z.enum(['novel', 'refine']) })

  it('rejects a truncated reply even when its JSON prefix parses', () => {
    const out = parseModelOutput(textReply('{"verdict":"novel"}', 'max_tokens'), Shape)
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.reason).toBe('truncated')
  })

  it('rejects text that is not JSON', () => {
    const out = parseModelOutput(textReply('I cannot help with that.'), Shape)
    expect(out.ok === false && out.reason).toBe('no_json')
  })

  it('rejects JSON of the wrong shape — never a cast', () => {
    const out = parseModelOutput(textReply('{"verdict":"definitely-novel"}'), Shape)
    expect(out.ok === false && out.reason).toBe('shape')
  })

  it('rejects an empty content array as no_text, not a crash', () => {
    const out = parseModelOutput(reply([]), Shape)
    expect(out.ok === false && out.reason).toBe('no_text')
  })

  it('accepts a valid reply hiding behind a thinking block (positive control)', () => {
    const out = parseModelOutput(
      reply([{ type: 'thinking', thinking: '…' }, { type: 'text', text: '{"verdict":"refine"}' }]),
      Shape,
    )
    expect(out).toEqual({ ok: true, data: { verdict: 'refine' } })
  })

  it('never puts model text in the log line', () => {
    const out = parseModelJson('SECRET STUDENT ANSWER', Shape)
    expect(out.ok === false && out.logDetail).toBe('reason=no_json stop=none len=21')
    expect(out.ok === false && out.logDetail).not.toContain('SECRET')
  })
})

describe('gradeAnswers — a grade is a parsed row, not "a non-empty array"', () => {
  it('accepts a well-formed grading reply (positive control)', async () => {
    mocks.aiCreate.mockResolvedValue(textReply(goodGrades))
    const result = await gradeCall()
    expect(result.ok).toBe(true)
    expect(result.ok === true && result.graded).toHaveLength(5)
  })

  it('refuses `[null]` instead of handing it to the grade map', async () => {
    mocks.aiCreate.mockResolvedValue(textReply('[null]'))
    await expect(gradeCall()).resolves.toEqual({ ok: false })
  })

  it('refuses a STRING score, which clampScore would have laundered into KP', async () => {
    // Proof the laundering was real: the clamp does not defend against this.
    expect(clampScore('95' as unknown as number)).toBe(95)
    mocks.aiCreate.mockResolvedValue(
      textReply('[{"questionId":"q1","score":"95","rationale":"ok"}]'),
    )
    await expect(gradeCall()).resolves.toEqual({ ok: false })
  })

  it('refuses a NaN-producing score, which reached the Prisma Int column', async () => {
    // `Number.isNaN('lots')` is false, so the clamp returned NaN, and NaN went
    // into `paperQuizAttempt.score` — a mid-transaction failure after the spend.
    expect(clampScore('lots' as unknown as number)).toBeNaN()
    mocks.aiCreate.mockResolvedValue(
      textReply('[{"questionId":"q1","score":"lots","rationale":"x"}]'),
    )
    await expect(gradeCall()).resolves.toEqual({ ok: false })
  })

  it('refuses a row with no questionId', async () => {
    mocks.aiCreate.mockResolvedValue(textReply('[{"score":100,"rationale":"full marks"}]'))
    await expect(gradeCall()).resolves.toEqual({ ok: false })
  })

  it('refuses a truncated grading reply whose prefix is a valid one-row array', async () => {
    // The economy consequence, stated: a five-question session aggregated over
    // one returned row is the P1-S3 shape — this is the reply that produced it.
    const oneRow = [{ questionId: 'q1', score: 100, rationale: 'ok' }]
    const questions = ['q1', 'q2', 'q3', 'q4', 'q5'].map((id) => ({ id }))
    expect(aggregateOverQuestions(questions, oneRow, clampScore)).toBe(20)

    mocks.aiCreate.mockResolvedValue(textReply(JSON.stringify(oneRow), 'max_tokens'))
    await expect(gradeCall()).resolves.toEqual({ ok: false })
  })

  it('refuses an empty content array — the paid call is lost, not the process', async () => {
    mocks.aiCreate.mockResolvedValue(reply([]))
    await expect(gradeCall()).resolves.toEqual({ ok: false })
  })

  it('reads the grades from behind a leading thinking block', async () => {
    mocks.aiCreate.mockResolvedValue(
      reply([{ type: 'thinking', thinking: '…' }, { type: 'text', text: goodGrades }]),
    )
    const result = await gradeCall()
    expect(result.ok === true && result.graded).toHaveLength(5)
  })
})

describe('classifyLabType — an empty reply must not throw out of a paid advance', () => {
  it('falls back to the default lab type instead of a TypeError', async () => {
    const { classifyLabType } = await import('@/lib/lab-type/classify')
    mocks.aiCreate.mockResolvedValue(reply([]))
    await expect(classifyLabType('anything')).resolves.toEqual({
      labType: 'volt_lab',
      rationale: 'Could not classify — defaulted to Volt Lab.',
    })
  })

  it('refuses a lab type that is not one of the six', async () => {
    const { classifyLabType } = await import('@/lib/lab-type/classify')
    mocks.aiCreate.mockResolvedValue(textReply('{"labType":"superlab","rationale":"mine now"}'))
    const out = await classifyLabType('anything')
    expect(out.labType).toBe('volt_lab')
  })
})
