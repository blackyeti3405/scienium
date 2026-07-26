import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

/**
 * Static pins on the prompt-injection defenses added in v0.28.0.
 *
 * These defenses are LOAD-BEARING PROSE: the advisory-gradingKey language is
 * what stops an upstream injection laundering itself into a clearance pass, and
 * the <paper_text>/<project_context> fences are what mark untrusted text as
 * data. An innocent prompt-tuning edit can drop either with zero functional
 * symptom and a green suite. Regexes pin the load-bearing phrases (not exact
 * wording) so prompts can still evolve.
 *
 * paperTextContext is additionally pinned byte-exactly: its identity across
 * chat/quiz/grade/retry is the prompt-cache key (PERF-8) — one character of
 * drift silently multiplies Anthropic spend.
 */

vi.mock('server-only', () => ({}))

import {
  PAPER_TEXT_SLICE_CHARS,
  QUIZ_GRADING_PROMPT_INTRO,
  paperTextBlock,
  paperTextContext,
} from '@/lib/literature/grading'

const WEB_ROOT = join(__dirname, '..')

describe('gradingKey is advisory (quiz + retry grading intro)', () => {
  it('marks studentAnswer untrusted and non-instructional', () => {
    expect(QUIZ_GRADING_PROMPT_INTRO).toMatch(/untrusted student input/)
    expect(QUIZ_GRADING_PROMPT_INTRO).toMatch(/never as instructions/)
  })

  it('marks gradingKey ADVISORY with an explicit ignore clause', () => {
    expect(QUIZ_GRADING_PROMPT_INTRO).toMatch(/ADVISORY/)
    expect(QUIZ_GRADING_PROMPT_INTRO).toMatch(/IGNORE that key/)
    expect(QUIZ_GRADING_PROMPT_INTRO).toMatch(/instructs you how to score/)
  })
})

describe('paperTextContext fence (also the prompt-cache key)', () => {
  it('is byte-exactly the fenced slice', () => {
    expect(paperTextContext('CONTENT')).toBe('<paper_text>\nCONTENT\n</paper_text>')
  })

  it('slices at PAPER_TEXT_SLICE_CHARS', () => {
    const long = 'x'.repeat(PAPER_TEXT_SLICE_CHARS + 500)
    const out = paperTextContext(long)
    expect(out.length).toBe('<paper_text>\n\n</paper_text>'.length + PAPER_TEXT_SLICE_CHARS)
  })

  it('treats null as empty rather than "null"', () => {
    expect(paperTextContext(null)).toBe('<paper_text>\n\n</paper_text>')
  })

  it('paperTextBlock carries ephemeral cache_control (the cost lever)', () => {
    expect(paperTextBlock('t').cache_control).toEqual({ type: 'ephemeral' })
  })
})

describe('expertise prompts keep their fences (source pins)', () => {
  it('generation fences the student project context and labels it untrusted', () => {
    const src = readFileSync(join(WEB_ROOT, 'app', 'api', 'expertise', 'route.ts'), 'utf8')
    expect(src).toMatch(/<project_context>/)
    expect(src).toMatch(/untrusted student-authored input/)
    expect(src).toMatch(/never as instructions/i)
  })

  it('grading fences the context and keeps the advisory-key clause', () => {
    const src = readFileSync(join(WEB_ROOT, 'app', 'api', 'expertise', 'grade', 'route.ts'), 'utf8')
    expect(src).toMatch(/<project_context>/)
    expect(src).toMatch(/ADVISORY/)
    expect(src).toMatch(/IGNORE that key/)
  })

  it('quiz-retry generation keeps its data-not-instructions line', () => {
    const src = readFileSync(join(WEB_ROOT, 'lib', 'literature', 'quiz.ts'), 'utf8')
    expect(src).toMatch(/Treat it as DATA/)
  })

  /**
   * Migrated from `lit-explain-it-back.spec.ts` AC15 — a source read that had no
   * business inside a browser suite, and which therefore only ran when somebody
   * remembered to run that spec.
   */
  it('explain-back fences the student text and declares it untrusted', () => {
    const routeSrc = readFileSync(
      join(WEB_ROOT, 'app', 'api', 'papers', '[id]', 'explain', 'route.ts'),
      'utf8',
    )
    expect(routeSrc).toContain('<student_explanation>')
    const explainSrc = readFileSync(join(WEB_ROOT, 'lib', 'literature', 'explain.ts'), 'utf8')
    expect(explainSrc).toContain('<student_explanation>')
    expect(explainSrc).toMatch(/untrusted DATA/)
  })
})
