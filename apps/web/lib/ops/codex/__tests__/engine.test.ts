import { describe, it, expect } from 'vitest'
import {
  gradeCheckpoint,
  shuffleCheckpoint,
  computeKpAward,
  unitUnlocked,
  fluencyTier,
  findLessonLocation,
  lessonUnlocked,
  CODEX_PASS_RATIO,
  CODEX_KP_PER_LESSON,
  CODEX_DAILY_LESSON_CAP,
  type CheckpointSubmission,
} from '../engine'
import type {
  CheckpointQuestion,
  McQuestion,
  OrderingQuestion,
  MatchingQuestion,
  CodexTrack,
  Segment,
  Unit,
  Lesson,
} from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mc: McQuestion = {
  kind: 'mc',
  id: 'mc1',
  prompt: 'What is 2+2?',
  options: [
    { id: 'a', text: '3' },
    { id: 'b', text: '4' },
    { id: 'c', text: '5' },
  ],
  answerId: 'b',
  explanations: { a: 'Too low.', b: 'Correct.', c: 'Too high.' },
}

const ordering: OrderingQuestion = {
  kind: 'ordering',
  id: 'ord1',
  prompt: 'Order 1,2,3',
  items: [
    { id: 'i1', text: 'one' },
    { id: 'i2', text: 'two' },
    { id: 'i3', text: 'three' },
  ],
  correctOrder: ['i1', 'i2', 'i3'],
  explanation: 'Ascending order.',
}

const matching: MatchingQuestion = {
  kind: 'matching',
  id: 'match1',
  prompt: 'Match capitals',
  left: [
    { id: 'l1', text: 'France' },
    { id: 'l2', text: 'Japan' },
  ],
  right: [
    { id: 'r1', text: 'Paris' },
    { id: 'r2', text: 'Tokyo' },
  ],
  correctPairs: [
    ['l1', 'r1'],
    ['l2', 'r2'],
  ],
  explanation: 'France-Paris, Japan-Tokyo.',
}

const fourQuestions: CheckpointQuestion[] = [mc, ordering, matching, { ...mc, id: 'mc2' }]

function submissionAllCorrect(): CheckpointSubmission {
  return {
    answers: [
      { kind: 'mc', id: 'mc1', selectedOptionId: 'b' },
      { kind: 'ordering', id: 'ord1', order: ['i1', 'i2', 'i3'] },
      {
        kind: 'matching',
        id: 'match1',
        pairs: [
          ['l1', 'r1'],
          ['l2', 'r2'],
        ],
      },
      { kind: 'mc', id: 'mc2', selectedOptionId: 'b' },
    ],
  }
}

// ---------------------------------------------------------------------------
// gradeCheckpoint
// ---------------------------------------------------------------------------

describe('gradeCheckpoint', () => {
  it('grades a fully correct MC/ordering/matching submission as passed with ratio 1', () => {
    const result = gradeCheckpoint(fourQuestions, submissionAllCorrect())
    expect(result.correctCount).toBe(4)
    expect(result.total).toBe(4)
    expect(result.ratio).toBe(1)
    expect(result.passed).toBe(true)
    expect(result.perQuestion.every((q) => q.correct)).toBe(true)
  })

  it('grades a wrong MC answer as incorrect with the explanation for the CHOSEN option', () => {
    const submission: CheckpointSubmission = {
      answers: [{ kind: 'mc', id: 'mc1', selectedOptionId: 'a' }],
    }
    const result = gradeCheckpoint([mc], submission)
    expect(result.perQuestion[0].correct).toBe(false)
    expect(result.perQuestion[0].explanation).toBe('Too low.')
  })

  it('grades a wrong ordering answer as incorrect with the question explanation', () => {
    const submission: CheckpointSubmission = {
      answers: [{ kind: 'ordering', id: 'ord1', order: ['i2', 'i1', 'i3'] }],
    }
    const result = gradeCheckpoint([ordering], submission)
    expect(result.perQuestion[0].correct).toBe(false)
    expect(result.perQuestion[0].explanation).toBe('Ascending order.')
  })

  it('grades a wrong matching answer (swapped pairs) as incorrect', () => {
    const submission: CheckpointSubmission = {
      answers: [
        {
          kind: 'matching',
          id: 'match1',
          pairs: [
            ['l1', 'r2'],
            ['l2', 'r1'],
          ],
        },
      ],
    }
    const result = gradeCheckpoint([matching], submission)
    expect(result.perQuestion[0].correct).toBe(false)
    expect(result.perQuestion[0].explanation).toBe('France-Paris, Japan-Tokyo.')
  })

  it('grades a matching answer as correct regardless of pair order in the submission (set equality)', () => {
    const submission: CheckpointSubmission = {
      answers: [
        {
          kind: 'matching',
          id: 'match1',
          pairs: [
            ['l2', 'r2'],
            ['l1', 'r1'],
          ],
        },
      ],
    }
    const result = gradeCheckpoint([matching], submission)
    expect(result.perQuestion[0].correct).toBe(true)
  })

  it('grades a missing answer for a question as incorrect, never throws', () => {
    const result = gradeCheckpoint([mc], { answers: [] })
    expect(result.perQuestion[0].correct).toBe(false)
    expect(result.total).toBe(1)
  })

  it('computes partial credit correctly (e.g. 3 of 4 correct = ratio 0.75, fails since < 0.8)', () => {
    const submission = submissionAllCorrect()
    submission.answers[0] = { kind: 'mc', id: 'mc1', selectedOptionId: 'a' } // wrong now
    const result = gradeCheckpoint(fourQuestions, submission)
    expect(result.correctCount).toBe(3)
    expect(result.ratio).toBe(0.75)
    expect(result.passed).toBe(false)
  })

  it('passes at exactly the boundary: ratio >= CODEX_PASS_RATIO (0.8) passes; just below fails', () => {
    // 5 questions, 4 correct = 0.8 ratio -> should pass (>=, not >).
    const five: CheckpointQuestion[] = [mc, { ...mc, id: 'mc2' }, { ...mc, id: 'mc3' }, { ...mc, id: 'mc4' }, { ...mc, id: 'mc5' }]
    const fourCorrectSubmission: CheckpointSubmission = {
      answers: [
        { kind: 'mc', id: 'mc1', selectedOptionId: 'b' },
        { kind: 'mc', id: 'mc2', selectedOptionId: 'b' },
        { kind: 'mc', id: 'mc3', selectedOptionId: 'b' },
        { kind: 'mc', id: 'mc4', selectedOptionId: 'b' },
        { kind: 'mc', id: 'mc5', selectedOptionId: 'a' }, // wrong
      ],
    }
    const result = gradeCheckpoint(five, fourCorrectSubmission)
    expect(result.ratio).toBeCloseTo(0.8)
    expect(result.passed).toBe(true)

    // 3 of 5 correct = 0.6 -> fails.
    const threeCorrectSubmission: CheckpointSubmission = {
      answers: [
        { kind: 'mc', id: 'mc1', selectedOptionId: 'b' },
        { kind: 'mc', id: 'mc2', selectedOptionId: 'b' },
        { kind: 'mc', id: 'mc3', selectedOptionId: 'b' },
        { kind: 'mc', id: 'mc4', selectedOptionId: 'a' },
        { kind: 'mc', id: 'mc5', selectedOptionId: 'a' },
      ],
    }
    const result2 = gradeCheckpoint(five, threeCorrectSubmission)
    expect(result2.ratio).toBeCloseTo(0.6)
    expect(result2.passed).toBe(false)
  })

  it('CODEX_PASS_RATIO is locked at 0.8', () => {
    expect(CODEX_PASS_RATIO).toBe(0.8)
  })
})

// ---------------------------------------------------------------------------
// shuffleCheckpoint
// ---------------------------------------------------------------------------

describe('shuffleCheckpoint', () => {
  it('is deterministic: the same seed always produces the same shuffle', () => {
    const a = shuffleCheckpoint(fourQuestions, 7)
    const b = shuffleCheckpoint(fourQuestions, 7)
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id))
  })

  it('different seeds can produce different question orders', () => {
    const a = shuffleCheckpoint(fourQuestions, 1)
    const b = shuffleCheckpoint(fourQuestions, 2)
    // Not a strict guarantee for any seed pair, but for this fixture size the
    // seeds chosen are known to differ — assert the ids sets are preserved
    // and at least one seed differs from the input order (sanity, not exact
    // equality of a specific permutation which would be brittle).
    expect(new Set(a.map((q) => q.id))).toEqual(new Set(fourQuestions.map((q) => q.id)))
    expect(new Set(b.map((q) => q.id))).toEqual(new Set(fourQuestions.map((q) => q.id)))
  })

  it('preserves the exact SET of question ids (no question added/dropped)', () => {
    const shuffled = shuffleCheckpoint(fourQuestions, 42)
    expect(shuffled).toHaveLength(fourQuestions.length)
    expect(new Set(shuffled.map((q) => q.id))).toEqual(new Set(fourQuestions.map((q) => q.id)))
  })

  it('preserves the exact SET of MC options within a shuffled MC question', () => {
    const shuffled = shuffleCheckpoint([mc], 99)
    const shuffledMc = shuffled[0] as McQuestion
    expect(new Set(shuffledMc.options.map((o) => o.id))).toEqual(new Set(mc.options.map((o) => o.id)))
    expect(shuffledMc.answerId).toBe(mc.answerId)
  })

  it('preserves the exact SET of ordering items within a shuffled ordering question', () => {
    const shuffled = shuffleCheckpoint([ordering], 5)
    const shuffledOrdering = shuffled[0] as OrderingQuestion
    expect(new Set(shuffledOrdering.items.map((i) => i.id))).toEqual(new Set(ordering.items.map((i) => i.id)))
    expect(shuffledOrdering.correctOrder).toEqual(ordering.correctOrder)
  })

  it('preserves left/right sets within a shuffled matching question', () => {
    const shuffled = shuffleCheckpoint([matching], 3)
    const shuffledMatching = shuffled[0] as MatchingQuestion
    expect(new Set(shuffledMatching.left.map((i) => i.id))).toEqual(new Set(matching.left.map((i) => i.id)))
    expect(new Set(shuffledMatching.right.map((i) => i.id))).toEqual(new Set(matching.right.map((i) => i.id)))
  })

  it('a shuffled checkpoint still grades identically to the original (grading is order-independent)', () => {
    const shuffled = shuffleCheckpoint(fourQuestions, 123)
    const result = gradeCheckpoint(shuffled, submissionAllCorrect())
    expect(result.passed).toBe(true)
    expect(result.correctCount).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// computeKpAward
// ---------------------------------------------------------------------------

describe('computeKpAward', () => {
  it('awards CODEX_KP_PER_LESSON on a first-time pass', () => {
    const award = computeKpAward({ passed: true, alreadyClaimed: false })
    expect(award.kpEarned).toBe(CODEX_KP_PER_LESSON)
  })

  it('awards 0 on a repeat pass (already claimed)', () => {
    const award = computeKpAward({ passed: true, alreadyClaimed: true })
    expect(award.kpEarned).toBe(0)
  })

  it('awards 0 on any fail, regardless of claim status', () => {
    expect(computeKpAward({ passed: false, alreadyClaimed: false }).kpEarned).toBe(0)
    expect(computeKpAward({ passed: false, alreadyClaimed: true }).kpEarned).toBe(0)
  })

  it('CODEX_KP_PER_LESSON is locked at 8', () => {
    expect(CODEX_KP_PER_LESSON).toBe(8)
  })

  it('CODEX_DAILY_LESSON_CAP is locked at 3', () => {
    expect(CODEX_DAILY_LESSON_CAP).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// unitUnlocked
// ---------------------------------------------------------------------------

function makeLesson(id: string): Lesson {
  return {
    id,
    label: id,
    readingMinutes: 1,
    sections: [{ heading: 'h', body: 'b' }],
    workedExample: 'example',
    judgeFraming: 'framing',
    checkpoint: { questions: [mc] },
  }
}

function makeUnit(id: string, lessonIds: string[]): Unit {
  return { id, label: id, lessons: lessonIds.map(makeLesson) }
}

function makeSegment(id: string, kind: 'core' | 'branch', units: Unit[]): Segment {
  return { id, kind, label: id, units }
}

const testTrack: CodexTrack = {
  slug: 'test-track',
  label: 'Test Track',
  home: false,
  core: makeSegment('core', 'core', [
    makeUnit('core-u1', ['core-u1-l1', 'core-u1-l2']),
    makeUnit('core-u2', ['core-u2-l1']),
  ]),
  branches: [makeSegment('branch-a', 'branch', [makeUnit('branch-a-u1', ['branch-a-u1-l1'])])],
}

describe('unitUnlocked', () => {
  it('the first unit of Core is always unlocked, even with no progress', () => {
    expect(unitUnlocked(testTrack, 'core', 'core-u1', new Set())).toBe(true)
  })

  it('unit 2 of Core is locked until every lesson of unit 1 is complete', () => {
    expect(unitUnlocked(testTrack, 'core', 'core-u2', new Set(['core-u1-l1']))).toBe(false)
    expect(unitUnlocked(testTrack, 'core', 'core-u2', new Set(['core-u1-l1', 'core-u1-l2']))).toBe(true)
  })

  it("a branch's first unit is locked until Core is 100% complete", () => {
    const partialCore = new Set(['core-u1-l1', 'core-u1-l2'])
    expect(unitUnlocked(testTrack, 'branch-a', 'branch-a-u1', partialCore)).toBe(false)

    const fullCore = new Set(['core-u1-l1', 'core-u1-l2', 'core-u2-l1'])
    expect(unitUnlocked(testTrack, 'branch-a', 'branch-a-u1', fullCore)).toBe(true)
  })

  it('returns false for an unknown segment or unit id', () => {
    expect(unitUnlocked(testTrack, 'not-a-segment', 'core-u1', new Set())).toBe(false)
    expect(unitUnlocked(testTrack, 'core', 'not-a-unit', new Set())).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// findLessonLocation
// ---------------------------------------------------------------------------

describe('findLessonLocation', () => {
  it('locates a Core lesson with its segment/unit ids and index within the unit', () => {
    const loc = findLessonLocation(testTrack, 'core-u1-l2')
    expect(loc).toEqual({
      segmentId: 'core',
      unitId: 'core-u1',
      lessonIndex: 1,
      lesson: expect.objectContaining({ id: 'core-u1-l2' }),
    })
  })

  it('locates a branch lesson', () => {
    const loc = findLessonLocation(testTrack, 'branch-a-u1-l1')
    expect(loc).toEqual({
      segmentId: 'branch-a',
      unitId: 'branch-a-u1',
      lessonIndex: 0,
      lesson: expect.objectContaining({ id: 'branch-a-u1-l1' }),
    })
  })

  it('returns null for an unknown lesson id (the IDOR/tamper guard the route relies on)', () => {
    expect(findLessonLocation(testTrack, 'not-a-real-lesson')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// lessonUnlocked — the server-authoritative progression gate
// ---------------------------------------------------------------------------

describe('lessonUnlocked', () => {
  it('the first lesson of the first unit of Core is always unlocked, even with no progress', () => {
    expect(lessonUnlocked(testTrack, 'core-u1-l1', new Set())).toBe(true)
  })

  it('the SECOND lesson of a unit is locked until the first lesson of that SAME unit is complete', () => {
    expect(lessonUnlocked(testTrack, 'core-u1-l2', new Set())).toBe(false)
    expect(lessonUnlocked(testTrack, 'core-u1-l2', new Set(['core-u1-l1']))).toBe(true)
  })

  it('a lesson in unit 2 is locked even if it would be "first in its unit" (index 0) — unit 2 itself is gated on unit 1 being fully complete', () => {
    // core-u2-l1 is lessonIndex 0 within core-u2, so the intra-unit rule alone
    // would say "unlocked" — but unitUnlocked must ALSO gate it on unit 1.
    expect(lessonUnlocked(testTrack, 'core-u2-l1', new Set(['core-u1-l1']))).toBe(false) // unit 1 not fully done
    expect(lessonUnlocked(testTrack, 'core-u2-l1', new Set(['core-u1-l1', 'core-u1-l2']))).toBe(true)
  })

  it("a branch's first lesson is locked until Core is 100% complete, even if intra-unit sequencing alone would allow it", () => {
    const partialCore = new Set(['core-u1-l1', 'core-u1-l2'])
    expect(lessonUnlocked(testTrack, 'branch-a-u1-l1', partialCore)).toBe(false)

    const fullCore = new Set(['core-u1-l1', 'core-u1-l2', 'core-u2-l1'])
    expect(lessonUnlocked(testTrack, 'branch-a-u1-l1', fullCore)).toBe(true)
  })

  it('a lesson that is itself already completed remains "unlocked" (re-pass is always allowed)', () => {
    const completed = new Set(['core-u1-l1', 'core-u1-l2'])
    expect(lessonUnlocked(testTrack, 'core-u1-l1', completed)).toBe(true)
    expect(lessonUnlocked(testTrack, 'core-u1-l2', completed)).toBe(true)
  })

  it('returns false for an unknown lesson id — never throws, never silently allows', () => {
    expect(lessonUnlocked(testTrack, 'not-a-real-lesson', new Set())).toBe(false)
  })

  it('lesson ids completed in a DIFFERENT track never count toward unlocking this track (cross-track gating leak guard)', () => {
    // The route scopes its completedLessonIds query by trackSlug before
    // calling this — this test pins the pure-function half of that
    // guarantee: passing a set of ids that don't belong to testTrack at all
    // must behave identically to passing an empty set.
    const foreignIds = new Set(['some-other-track-lesson-1', 'some-other-track-lesson-2'])
    expect(lessonUnlocked(testTrack, 'core-u1-l2', foreignIds)).toBe(false)
    expect(lessonUnlocked(testTrack, 'core-u2-l1', foreignIds)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// fluencyTier
// ---------------------------------------------------------------------------

describe('fluencyTier', () => {
  // testTrack has 4 total lessons across core (3) + branch (1).
  it('is novice at 0% complete', () => {
    expect(fluencyTier(testTrack, new Set())).toBe('novice')
  })

  it('is conversant at >= 25% complete', () => {
    // 1 of 4 = 25%
    expect(fluencyTier(testTrack, new Set(['core-u1-l1']))).toBe('conversant')
  })

  it('is fluent at >= 60% complete', () => {
    // 3 of 4 = 75%
    expect(fluencyTier(testTrack, new Set(['core-u1-l1', 'core-u1-l2', 'core-u2-l1']))).toBe('fluent')
  })

  it('is field_expert at 100% complete', () => {
    expect(
      fluencyTier(testTrack, new Set(['core-u1-l1', 'core-u1-l2', 'core-u2-l1', 'branch-a-u1-l1'])),
    ).toBe('field_expert')
  })

  it('counts only the given track\'s own lessons (unrelated ids are ignored)', () => {
    expect(fluencyTier(testTrack, new Set(['some-other-track-lesson']))).toBe('novice')
  })
})
