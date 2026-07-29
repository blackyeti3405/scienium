import { describe, it, expect } from 'vitest'
import { CODEX_TRACKS, LABTYPE_FIELDS, labTypeFields, loadTrack } from '../index'
import type { CodexTrack, Lesson, CheckpointQuestion } from '../types'
import { LAB_TYPES } from '@/lib/phase'

// Statically import every track module so the shape checks below reflect the
// real, on-disk content — mirrors charts-guide.test.ts's approach of eagerly
// importing every per-field module directly, alongside exercising the lazy
// `loadTrack` loader separately.
//
// GENERATED — the import run below and ALL_TRACK_MODULES are regenerated from
// ../content/*.json by `pnpm --filter web codex:merge`. Don't hand-edit them;
// `/codex-pipeline` keeps them in step with the shipped fields.
import acousticsSound from '../tracks/acoustics-sound'
import astronomyAstrophysics from '../tracks/astronomy-astrophysics'
import chemistry from '../tracks/chemistry'
import classicalMechanicsPhysics from '../tracks/classical-mechanics-physics'
import clinicalMedicinePharmacology from '../tracks/clinical-medicine-pharmacology'
import computerScienceAlgorithms from '../tracks/computer-science-algorithms'
import dataScienceMlMetrics from '../tracks/data-science-ml-metrics'
import ecology from '../tracks/ecology'
import electronicsElectricalEngineering from '../tracks/electronics-electrical-engineering'
import environmentalEarthScience from '../tracks/environmental-earth-science'
import epidemiologyMedicine from '../tracks/epidemiology-medicine'
import fluidDynamicsAerodynamics from '../tracks/fluid-dynamics-aerodynamics'
import gaitBiomechanics from '../tracks/gait-biomechanics'

const ALL_TRACK_MODULES: Record<string, CodexTrack> = {
  'acoustics-sound': acousticsSound,
  'astronomy-astrophysics': astronomyAstrophysics,
  'chemistry': chemistry,
  'classical-mechanics-physics': classicalMechanicsPhysics,
  'clinical-medicine-pharmacology': clinicalMedicinePharmacology,
  'computer-science-algorithms': computerScienceAlgorithms,
  'data-science-ml-metrics': dataScienceMlMetrics,
  'ecology': ecology,
  'electronics-electrical-engineering': electronicsElectricalEngineering,
  'environmental-earth-science': environmentalEarthScience,
  'epidemiology-medicine': epidemiologyMedicine,
  'fluid-dynamics-aerodynamics': fluidDynamicsAerodynamics,
  'gait-biomechanics': gaitBiomechanics,
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

function allLessons(track: CodexTrack): Lesson[] {
  return [track.core, ...track.branches].flatMap((seg) => seg.units.flatMap((u) => u.lessons))
}

// ---------------------------------------------------------------------------
// CODEX_TRACKS index
// ---------------------------------------------------------------------------

describe('CODEX_TRACKS index', () => {
  it('has at least 1 track (the gait-biomechanics flagship field)', () => {
    expect(CODEX_TRACKS.length).toBeGreaterThanOrEqual(1)
  })

  it('has no duplicate slugs', () => {
    const slugs = CODEX_TRACKS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every slug is slug-safe', () => {
    for (const t of CODEX_TRACKS) {
      expect(t.slug).toMatch(SLUG_RE)
    }
  })

  it('every track slug in CODEX_TRACKS has a real backing module, and vice versa', () => {
    const indexSlugs = new Set(CODEX_TRACKS.map((t) => t.slug))
    expect(indexSlugs.size).toBe(Object.keys(ALL_TRACK_MODULES).length)
    for (const slug of Object.keys(ALL_TRACK_MODULES)) {
      expect(indexSlugs.has(slug)).toBe(true)
    }
  })

  it("every summary's declared branchCount/lessonCount matches the real module", () => {
    for (const t of CODEX_TRACKS) {
      const mod = ALL_TRACK_MODULES[t.slug]
      expect(mod).toBeDefined()
      expect(mod.branches.length).toBe(t.branchCount)
      expect(allLessons(mod).length).toBe(t.lessonCount)
    }
  })

  it('LABTYPE_FIELDS has a non-empty, ordered field-slug list for every lab type', () => {
    for (const labType of LAB_TYPES) {
      const fields = LABTYPE_FIELDS[labType]
      expect(fields).toBeDefined()
      expect(fields.length).toBeGreaterThan(0)
      expect(new Set(fields).size).toBe(fields.length) // no duplicates
    }
  })

  it('labTypeFields() filters LABTYPE_FIELDS down to slugs that actually exist in CODEX_TRACKS', () => {
    const builtSlugs = new Set(CODEX_TRACKS.map((t) => t.slug))
    for (const labType of LAB_TYPES) {
      const filtered = labTypeFields(labType)
      for (const slug of filtered) {
        expect(builtSlugs.has(slug)).toBe(true)
      }
      // Every filtered slug must also appear in the raw (unfiltered) list.
      for (const slug of filtered) {
        expect(LABTYPE_FIELDS[labType]).toContain(slug)
      }
    }
  })

  it('the flagship (gait-biomechanics) track has at least 1 branch', () => {
    expect(gaitBiomechanics.branches.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// loadTrack (lazy loader)
// ---------------------------------------------------------------------------

describe('loadTrack', () => {
  it('resolves every declared track slug to a track whose lesson count matches its CODEX_TRACKS summary', async () => {
    for (const t of CODEX_TRACKS) {
      const track = await loadTrack(t.slug)
      expect(track.slug).toBe(t.slug)
      expect(allLessons(track).length).toBe(t.lessonCount)
    }
  })

  it('rejects an unknown slug', async () => {
    await expect(loadTrack('not-a-real-track')).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Content shape invariants (every track, every lesson, every checkpoint)
// ---------------------------------------------------------------------------

const ALL_LESSONS_WITH_TRACK: { track: string; lesson: Lesson }[] = Object.entries(ALL_TRACK_MODULES).flatMap(
  ([slug, track]) => allLessons(track).map((lesson) => ({ track: slug, lesson })),
)
const ALL_LESSONS: Lesson[] = ALL_LESSONS_WITH_TRACK.map((x) => x.lesson)

describe('Lesson id uniqueness and slug-safety (global, across every track)', () => {
  it('every lesson id is globally unique across every track', () => {
    const ids = ALL_LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every lesson id is slug-safe (lowercase, digits, single hyphens)', () => {
    for (const l of ALL_LESSONS) {
      expect(l.id).toMatch(SLUG_RE)
    }
  })

  it('every lesson has non-empty label, workedExample, judgeFraming, and at least one section', () => {
    for (const l of ALL_LESSONS) {
      expect(l.label.trim().length).toBeGreaterThan(0)
      expect(l.workedExample.trim().length).toBeGreaterThan(0)
      expect(l.judgeFraming.trim().length).toBeGreaterThan(0)
      expect(l.sections.length).toBeGreaterThan(0)
      for (const s of l.sections) {
        expect(s.heading.trim().length).toBeGreaterThan(0)
        expect(s.body.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every lesson has a positive readingMinutes', () => {
    for (const l of ALL_LESSONS) {
      expect(l.readingMinutes).toBeGreaterThan(0)
    }
  })
})

describe('Unit and segment id uniqueness within each track', () => {
  it('every unit id is unique within its own segment, and every segment id is unique within its track', () => {
    for (const track of Object.values(ALL_TRACK_MODULES)) {
      const segmentIds = [track.core.id, ...track.branches.map((b) => b.id)]
      expect(new Set(segmentIds).size).toBe(segmentIds.length)

      for (const segment of [track.core, ...track.branches]) {
        const unitIds = segment.units.map((u) => u.id)
        expect(new Set(unitIds).size).toBe(unitIds.length)
      }
    }
  })

  it('the core segment has kind "core" and every branch has kind "branch"', () => {
    for (const track of Object.values(ALL_TRACK_MODULES)) {
      expect(track.core.kind).toBe('core')
      for (const b of track.branches) {
        expect(b.kind).toBe('branch')
      }
    }
  })
})

describe('Checkpoint content shape (every lesson, every track)', () => {
  it('every checkpoint has 3-5 questions', () => {
    for (const l of ALL_LESSONS) {
      expect(l.checkpoint.questions.length).toBeGreaterThanOrEqual(3)
      expect(l.checkpoint.questions.length).toBeLessThanOrEqual(5)
    }
  })

  it('every question id is unique within its own checkpoint', () => {
    for (const l of ALL_LESSONS) {
      const ids = l.checkpoint.questions.map((q) => q.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('every MC question has a valid answerId AND a written explanation for every option (including the correct one)', () => {
    for (const l of ALL_LESSONS) {
      for (const q of l.checkpoint.questions) {
        if (q.kind !== 'mc') continue
        const optionIds = q.options.map((o) => o.id)
        expect(optionIds).toContain(q.answerId)
        for (const opt of q.options) {
          expect(q.explanations[opt.id]).toBeDefined()
          expect(q.explanations[opt.id]!.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('every ORDERING question has a correctOrder that is a permutation of its item ids, and a non-empty explanation', () => {
    for (const l of ALL_LESSONS) {
      for (const q of l.checkpoint.questions) {
        if (q.kind !== 'ordering') continue
        const itemIds = new Set(q.items.map((i) => i.id))
        expect(new Set(q.correctOrder)).toEqual(itemIds)
        expect(q.correctOrder.length).toBe(q.items.length)
        expect(q.explanation.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every MATCHING question has correctPairs covering every left id exactly once, valid right ids, and a non-empty explanation', () => {
    for (const l of ALL_LESSONS) {
      for (const q of l.checkpoint.questions) {
        if (q.kind !== 'matching') continue
        const leftIds = new Set(q.left.map((i) => i.id))
        const rightIds = new Set(q.right.map((i) => i.id))
        const pairedLeftIds = q.correctPairs.map(([l]) => l)
        expect(new Set(pairedLeftIds)).toEqual(leftIds)
        expect(pairedLeftIds.length).toBe(q.left.length)
        for (const [, r] of q.correctPairs) {
          expect(rightIds.has(r)).toBe(true)
        }
        expect(q.explanation.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every question is one of the three known kinds', () => {
    const validKinds = new Set(['mc', 'ordering', 'matching'])
    for (const l of ALL_LESSONS) {
      for (const q of l.checkpoint.questions as CheckpointQuestion[]) {
        expect(validKinds.has(q.kind)).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Flagship depth assertion (content-split note: this cycle ships a
// deep-authored gait-biomechanics Core (48 lessons across 8 units) plus the
// 5 canonical TAXONOMY.md subfield branches — the complete, exhaustive set
// of gait-biomechanics' subfields — 274 lessons total (see the module's own
// docblock, changes-gait-subfields.md, and changes-gait-deepen.md for the
// Core re-author that replaced the original shallow 5-unit/20-lesson Core,
// the branch re-author, and the removal of the off-taxonomy legacy Sports
// Biomechanics branch). This assertion matches what actually shipped, per
// the plan's instruction to "keep the assertion matching what actually
// shipped."
// ---------------------------------------------------------------------------

describe('Flagship track (Gait Biomechanics) depth', () => {
  it('has a fully authored Core segment (48 lessons across 8 units)', () => {
    expect(gaitBiomechanics.core.units.length).toBe(8)
    expect(allLessons({ ...gaitBiomechanics, branches: [] }).length).toBe(48)
  })

  it('has at least one complete specialization branch (>= 3 units)', () => {
    expect(gaitBiomechanics.branches.length).toBeGreaterThanOrEqual(1)
    expect(gaitBiomechanics.branches[0].units.length).toBeGreaterThanOrEqual(3)
  })

  it('ships at least 25 total lessons (Core + shipped branch content)', () => {
    expect(allLessons(gaitBiomechanics).length).toBeGreaterThanOrEqual(25)
  })
})
