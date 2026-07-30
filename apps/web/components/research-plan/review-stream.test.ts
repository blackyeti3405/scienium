import { describe, it, expect } from 'vitest'
import {
  EMPTY_REVIEW,
  TRUNCATED_STREAM_ERROR,
  initReviewStream,
  reduceReviewEvent,
  settleStream,
  type PlanReview,
} from './review-stream'

/**
 * REFACTOR2 P2-2 — a research result is only replaced by a run that reached its
 * explicit terminal event. Everything else (a dropped connection, a body cut
 * short, a server `error` line) keeps the last good result and asks for a retry.
 */

/** Feed a whole event sequence through the accumulator, as `readNdjson` does. */
function run(events: Record<string, unknown>[]) {
  return events.reduce(reduceReviewEvent, initReviewStream())
}

const GOOD_EVENTS = [
  { type: 'overall', readiness: 'promising', score: 72, summary: 'Solid start.' },
  { type: 'section', title: 'I. Question', score: 8, max: 10, assessment: 'Clear.' },
  { type: 'section', title: 'II. Method', score: 6, max: 10, assessment: 'Thin.' },
  { type: 'strength', text: 'Testable hypothesis' },
  { type: 'gap', text: 'No control group' },
  { type: 'recommendation', text: 'Add a control' },
  { type: 'done' },
]

const LAST_GOOD: PlanReview = {
  overall: { readiness: 'strong', score: 90, summary: 'Previous complete review.' },
  sections: [{ title: 'I. Question', score: 10, max: 10, assessment: 'Excellent.' }],
  strengths: ['Prior strength'],
  gaps: [],
  recommendations: [],
}

describe('review stream accumulator', () => {
  it('accumulates a complete run in event order and records the terminal event', () => {
    const acc = run(GOOD_EVENTS)
    expect(acc.done).toBe(true)
    expect(acc.error).toBeNull()
    expect(acc.value.overall).toEqual({ readiness: 'promising', score: 72, summary: 'Solid start.' })
    expect(acc.value.sections.map((s) => s.title)).toEqual(['I. Question', 'II. Method'])
    expect(acc.value.strengths).toEqual(['Testable hypothesis'])
    expect(acc.value.gaps).toEqual(['No control group'])
    expect(acc.value.recommendations).toEqual(['Add a control'])
  })

  it('ignores unknown event types instead of corrupting the accumulation', () => {
    const acc = run([...GOOD_EVENTS.slice(0, 2), { type: 'heartbeat' }, { nope: 1 }])
    expect(acc.value.sections).toHaveLength(1)
    expect(acc.done).toBe(false)
  })

  it('records a server error event without marking the run done', () => {
    const acc = run([GOOD_EVENTS[0], { type: 'error', error: 'Your plan changed' }])
    expect(acc.done).toBe(false)
    expect(acc.error).toBe('Your plan changed')
  })
})

describe('settleStream', () => {
  it('a completed run replaces the last good result', () => {
    const acc = run(GOOD_EVENTS)
    const settled = settleStream(acc, acc.value, LAST_GOOD)
    expect(settled.error).toBeNull()
    expect(settled.value).toBe(acc.value)
    expect(settled.value?.overall?.score).toBe(72)
  })

  it('a truncated EOF (no terminal event) keeps the last good result', () => {
    // Body ends after two events — the stream read completes with no error of
    // its own, which is exactly what made a half-rubric look like a review.
    const acc = run(GOOD_EVENTS.slice(0, 2))
    expect(acc.value.sections).toHaveLength(1) // partial really was accumulated
    const settled = settleStream(acc, acc.value, LAST_GOOD)
    expect(settled.value).toEqual(LAST_GOOD)
    expect(settled.error).toBe(TRUNCATED_STREAM_ERROR)
  })

  it('a mid-stream disconnect keeps the last good result and surfaces the reason', () => {
    let acc = run(GOOD_EVENTS.slice(0, 3))
    acc = { ...acc, error: 'Network error' } // what the hook's catch writes
    const settled = settleStream(acc, acc.value, LAST_GOOD)
    expect(settled.value).toEqual(LAST_GOOD)
    expect(settled.error).toBe('Network error')
  })

  it('a server error event keeps the last good result and shows the server message', () => {
    const acc = run([...GOOD_EVENTS.slice(0, 2), { type: 'error', error: 'Review failed — try again' }])
    const settled = settleStream(acc, acc.value, LAST_GOOD)
    expect(settled.value).toEqual(LAST_GOOD)
    expect(settled.error).toBe('Review failed — try again')
  })

  it('an error event that still ends with done does not get through', () => {
    // The review service sends `error` and returns; a `done` arriving too would
    // be a framing bug, and must not be read as success.
    const acc = run([{ type: 'error', error: 'boom' }, { type: 'done' }])
    const settled = settleStream(acc, acc.value, LAST_GOOD)
    expect(settled.value).toEqual(LAST_GOOD)
    expect(settled.error).toBe('boom')
  })

  it('a retry after a truncated run replaces the result once it completes', () => {
    const truncated = run(GOOD_EVENTS.slice(0, 2))
    const first = settleStream(truncated, truncated.value, LAST_GOOD)
    expect(first.value).toEqual(LAST_GOOD)

    const retried = run(GOOD_EVENTS)
    const second = settleStream(retried, retried.value, first.value)
    expect(second.error).toBeNull()
    expect(second.value?.overall?.score).toBe(72)
  })

  it('with no previous result, a failed run leaves nothing rather than a partial', () => {
    const acc = run(GOOD_EVENTS.slice(0, 3))
    const settled = settleStream(acc, acc.value, null)
    expect(settled.value).toBeNull()
    expect(settled.error).toBe(TRUNCATED_STREAM_ERROR)
  })

  it('holds for the idea check too: the verdict only exists on the terminal event', () => {
    const lastVerdict = { verdict: 'novel', findings: { summary: 'previous' } }
    // Activity events streamed, then the body died before `done`.
    const settled = settleStream({ done: false, error: null }, null, lastVerdict)
    expect(settled.value).toBe(lastVerdict)
    expect(settled.error).toBe(TRUNCATED_STREAM_ERROR)
  })

  it('EMPTY_REVIEW is the accumulator seed', () => {
    expect(initReviewStream().value).toBe(EMPTY_REVIEW)
  })
})
