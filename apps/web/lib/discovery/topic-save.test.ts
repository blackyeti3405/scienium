import { describe, expect, it } from 'vitest'
import { interpretTopicSaveResponse } from './topic-save'

/**
 * The topic-save protocol interpreter — shared by useFinalTopic (Discovery)
 * and LabProfileSettings. The headline case is the bug that motivated the
 * extraction: a non-2xx that is NEITHER 409 shape must come back as an error,
 * never as a success that clears the student's topic.
 */

describe('interpretTopicSaveResponse', () => {
  it('a 429 is an error, NOT a cleared topic (the original bug)', () => {
    const out = interpretTopicSaveResponse(429, { error: 'Slow down' }, 'New topic')
    expect(out).toEqual({ kind: 'error', message: 'Slow down' })
  })

  it('a 400 with no error body still errors with a fallback message', () => {
    expect(interpretTopicSaveResponse(400, {}, 'x')).toEqual({
      kind: 'error',
      message: 'Could not save topic',
    })
  })

  it('a 401/redirect-shaped HTML body (non-JSON parse → {}) is an error', () => {
    expect(interpretTopicSaveResponse(401, undefined, 'x').kind).toBe('error')
  })

  it('phase 0: 409 + requiresConfirmation carries the paper count', () => {
    expect(
      interpretTopicSaveResponse(409, { requiresConfirmation: true, paperCount: 4 }, 'New'),
    ).toEqual({ kind: 'needsConfirmation', newTopic: 'New', paperCount: 4 })
  })

  it('phase 1: 409 + requiresRemovalConfirmation carries only well-formed {id,title} rows', () => {
    const out = interpretTopicSaveResponse(
      409,
      {
        requiresRemovalConfirmation: true,
        papers: [{ id: 'p1', title: 'Keepable' }, { id: 42 }, 'junk', { title: 'no id' }],
      },
      'New',
    )
    expect(out).toEqual({
      kind: 'needsRemovalConfirmation',
      newTopic: 'New',
      papers: [{ id: 'p1', title: 'Keepable' }],
    })
  })

  it('a 409 with NEITHER flag is an error, not a confirmation loop', () => {
    expect(interpretTopicSaveResponse(409, { error: 'Conflict' }, 'x').kind).toBe('error')
  })

  it('success carries topic, removals, bonus, and connections with safe defaults', () => {
    expect(
      interpretTopicSaveResponse(
        200,
        { topic: 'Saved', removedCount: 2, removedTitles: ['A', 'B'], topicBonusKp: 25, connections: [] },
        'Saved',
      ),
    ).toEqual({
      kind: 'saved', topic: 'Saved', removedCount: 2, removedTitles: ['A', 'B'],
      topicBonusKp: 25, connections: [],
    })
  })

  it('success with a malformed body degrades to safe defaults instead of crashing', () => {
    expect(
      interpretTopicSaveResponse(200, { topic: null, removedTitles: 'oops' }, 'x'),
    ).toEqual({
      kind: 'saved', topic: null, removedCount: 0, removedTitles: [],
      topicBonusKp: null, connections: [],
    })
  })
})
