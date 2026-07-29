/**
 * Gate for the generated-content pipeline (source → wrapper).
 *
 * Complements `content-shape.test.ts` (semantic invariants) by proving the
 * source→wrapper mechanics are sound:
 *   1. every `../content/<slug>.json` validates against `TrackSchema` (zod),
 *   2. each wrapper module's default export is deep-equal to its JSON source
 *      (so the generated module changes nothing about the runtime data), and
 *   3. each track's stable checksum still matches the committed `.checksums.json`
 *      — the lock that a content edit was rebuilt on purpose (`pnpm --filter web
 *      codex:build`), not smuggled in.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { TrackSchema } from './track-schema'
import { stableStringify } from '../scripts/stable-stringify.mjs'
import type { CodexTrack } from '../types'

// GENERATED — the import run below and WRAPPERS are regenerated from
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
import geneticsGenomics from '../tracks/genetics-genomics'

const WRAPPERS: Record<string, CodexTrack> = {
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
  'genetics-genomics': geneticsGenomics,
}

function readContent(slug: string): unknown {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../content/${slug}.json`, import.meta.url)), 'utf8'))
}

/** Slugs on DISK — the source of truth `WRAPPERS` above is only a mirror of. */
function dirSlugs(dir: string, ext: string): string[] {
  return readdirSync(fileURLToPath(new URL(dir, import.meta.url)))
    .filter((f) => f.endsWith(ext) && !f.startsWith('.'))
    .map((f) => f.slice(0, -ext.length))
    .sort()
}

const committedChecksums: Record<string, string> = JSON.parse(
  readFileSync(fileURLToPath(new URL('../content/.checksums.json', import.meta.url)), 'utf8'),
)

describe('generated codex content', () => {
  /**
   * P2-S12: `WRAPPERS` is a hand-maintained inventory, so every per-slug
   * assertion below is only as complete as this map. A field shipped without
   * touching this file used to be validated by nothing — no zod parse, no
   * checksum, no deep-equal — and the suite stayed green while doing it.
   *
   * So the inventory is compared against the DIRECTORIES, not just against
   * itself: content/*.json is the source of truth, and tracks/, the checksum
   * lock, and this map must all match it exactly. `codex:build --check` (now
   * part of `check:integrity`) enforces the same four-way agreement in CI; this
   * is the half that also proves the TESTS cover every shipped field.
   */
  it('the wrapper inventory matches content/ on disk — no field escapes these tests', () => {
    expect(Object.keys(WRAPPERS).sort()).toEqual(dirSlugs('../content/', '.json'))
  })

  it('tracks/ on disk matches content/ — no orphan or missing wrapper', () => {
    expect(dirSlugs('../tracks/', '.ts')).toEqual(dirSlugs('../content/', '.json'))
  })

  it('every wrapper module has a committed checksum, and vice versa', () => {
    expect(Object.keys(committedChecksums).sort()).toEqual(Object.keys(WRAPPERS).sort())
  })

  for (const [slug, wrapper] of Object.entries(WRAPPERS)) {
    describe(slug, () => {
      const source = readContent(slug)

      it('content JSON validates against the zod TrackSchema', () => {
        expect(() => TrackSchema.parse(source)).not.toThrow()
      })

      it('wrapper default export is deep-equal to its JSON source', () => {
        expect(wrapper).toEqual(source)
      })

      it('stable checksum matches the committed .checksums.json', () => {
        const digest = createHash('sha256').update(stableStringify(source)).digest('hex')
        expect(digest).toBe(committedChecksums[slug])
      })
    })
  }
})
