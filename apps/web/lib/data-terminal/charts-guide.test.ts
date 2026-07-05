import { describe, it, expect } from 'vitest'
import { CHART_FIELDS, loadChartField } from '@/lib/data-terminal/charts-guide'
import type { ChartConcept } from '@/lib/data-terminal/charts-guide'

// ---------------------------------------------------------------------------
// Content shape invariants — the Charts Guide is now 29 lazily-loaded
// per-field modules (250 charts total, ~5MB of inline SVG) instead of one
// eager array, so these tests import every per-field module directly to
// total them, then exercise the lazy `loadChartField` loader.
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Statically import every per-field module so the totals below reflect the
// real, on-disk content — mirrors how `loadChartField` resolves each slug,
// just done eagerly here for the sake of the test.
import acousticsSound from './charts/acoustics-sound'
import astronomyAstrophysics from './charts/astronomy-astrophysics'
import chemistry from './charts/chemistry'
import classicalMechanicsPhysics from './charts/classical-mechanics-physics'
import clinicalMedicinePharmacology from './charts/clinical-medicine-pharmacology'
import computerScienceAlgorithms from './charts/computer-science-algorithms'
import dataScienceMlMetrics from './charts/data-science-ml-metrics'
import ecology from './charts/ecology'
import electronicsElectricalEngineering from './charts/electronics-electrical-engineering'
import environmentalEarthScience from './charts/environmental-earth-science'
import epidemiologyMedicine from './charts/epidemiology-medicine'
import fluidDynamicsAerodynamics from './charts/fluid-dynamics-aerodynamics'
import gaitBiomechanics from './charts/gait-biomechanics'
import geneticsGenomics from './charts/genetics-genomics'
import geologySeismology from './charts/geology-seismology'
import immunologyMicrobiology from './charts/immunology-microbiology'
import materialsScience from './charts/materials-science'
import meteorologyClimate from './charts/meteorology-climate'
import molecularCellBiology from './charts/molecular-cell-biology'
import neuroscience from './charts/neuroscience'
import nutritionFoodScience from './charts/nutrition-food-science'
import oceanographyLimnology from './charts/oceanography-limnology'
import opticsPhotonics from './charts/optics-photonics'
import plantScienceAgriculture from './charts/plant-science-agriculture'
import psychologyBehavioralScience from './charts/psychology-behavioral-science'
import renewableEnergy from './charts/renewable-energy'
import roboticsControlSystems from './charts/robotics-control-systems'
import signalProcessing from './charts/signal-processing'
import sportsExercisePhysiology from './charts/sports-exercise-physiology'

const ALL_FIELD_MODULES: Record<string, ChartConcept[]> = {
  'acoustics-sound': acousticsSound,
  'astronomy-astrophysics': astronomyAstrophysics,
  chemistry: chemistry,
  'classical-mechanics-physics': classicalMechanicsPhysics,
  'clinical-medicine-pharmacology': clinicalMedicinePharmacology,
  'computer-science-algorithms': computerScienceAlgorithms,
  'data-science-ml-metrics': dataScienceMlMetrics,
  ecology: ecology,
  'electronics-electrical-engineering': electronicsElectricalEngineering,
  'environmental-earth-science': environmentalEarthScience,
  'epidemiology-medicine': epidemiologyMedicine,
  'fluid-dynamics-aerodynamics': fluidDynamicsAerodynamics,
  'gait-biomechanics': gaitBiomechanics,
  'genetics-genomics': geneticsGenomics,
  'geology-seismology': geologySeismology,
  'immunology-microbiology': immunologyMicrobiology,
  'materials-science': materialsScience,
  'meteorology-climate': meteorologyClimate,
  'molecular-cell-biology': molecularCellBiology,
  neuroscience: neuroscience,
  'nutrition-food-science': nutritionFoodScience,
  'oceanography-limnology': oceanographyLimnology,
  'optics-photonics': opticsPhotonics,
  'plant-science-agriculture': plantScienceAgriculture,
  'psychology-behavioral-science': psychologyBehavioralScience,
  'renewable-energy': renewableEnergy,
  'robotics-control-systems': roboticsControlSystems,
  'signal-processing': signalProcessing,
  'sports-exercise-physiology': sportsExercisePhysiology,
}

const ALL_CHARTS: ChartConcept[] = Object.values(ALL_FIELD_MODULES).flat()

describe('CHART_FIELDS index', () => {
  it('has 29 fields', () => {
    expect(CHART_FIELDS).toHaveLength(29)
  })

  it('is sorted by label', () => {
    const sorted = [...CHART_FIELDS].sort((a, b) => a.label.localeCompare(b.label))
    expect(CHART_FIELDS.map((f) => f.label)).toEqual(sorted.map((f) => f.label))
  })

  it('has no duplicate slugs', () => {
    const slugs = CHART_FIELDS.map((f) => f.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every slug is slug-safe', () => {
    for (const f of CHART_FIELDS) {
      expect(f.slug).toMatch(SLUG_RE)
    }
  })

  it("every field's declared count matches the real per-field module it corresponds to", () => {
    for (const f of CHART_FIELDS) {
      const mod = ALL_FIELD_MODULES[f.slug]
      expect(mod).toBeDefined()
      expect(mod.length).toBe(f.count)
    }
  })

  it('every field slug in ALL_FIELD_MODULES appears in CHART_FIELDS and vice versa', () => {
    const fieldSlugs = new Set(CHART_FIELDS.map((f) => f.slug))
    expect(fieldSlugs.size).toBe(Object.keys(ALL_FIELD_MODULES).length)
    for (const slug of Object.keys(ALL_FIELD_MODULES)) {
      expect(fieldSlugs.has(slug)).toBe(true)
    }
  })
})

describe('CHARTS content shape (all 29 field modules combined)', () => {
  it('sums to at least 248 entries across all per-field modules', () => {
    expect(ALL_CHARTS.length).toBeGreaterThanOrEqual(248)
  })

  it('every id is unique globally, across every field', () => {
    const ids = ALL_CHARTS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every id is slug-safe (lowercase, digits, single hyphens)', () => {
    for (const c of ALL_CHARTS) {
      expect(c.id).toMatch(SLUG_RE)
    }
  })

  it('every field is one of the CHART_FIELDS labels', () => {
    const labels = new Set(CHART_FIELDS.map((f) => f.label))
    for (const c of ALL_CHARTS) {
      expect(labels.has(c.field)).toBe(true)
    }
  })

  it('every entry has non-empty title, field, plotType, description, and whatItTellsYou', () => {
    for (const c of ALL_CHARTS) {
      expect(c.title.trim().length).toBeGreaterThan(0)
      expect(c.field.trim().length).toBeGreaterThan(0)
      expect(c.plotType.trim().length).toBeGreaterThan(0)
      expect(c.description.trim().length).toBeGreaterThan(0)
      expect(c.whatItTellsYou.trim().length).toBeGreaterThan(0)
    }
  })

  it('every dataNeeded is a non-empty array of { name, unit } with both non-empty', () => {
    for (const c of ALL_CHARTS) {
      expect(Array.isArray(c.dataNeeded)).toBe(true)
      expect(c.dataNeeded.length).toBeGreaterThan(0)
      for (const d of c.dataNeeded) {
        expect(d.name.trim().length).toBeGreaterThan(0)
        expect(d.unit.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every exampleSvg starts with <svg and contains no <script', () => {
    for (const c of ALL_CHARTS) {
      expect(c.exampleSvg.trim().startsWith('<svg')).toBe(true)
      expect(c.exampleSvg).not.toContain('<script')
    }
  })
})

// ---------------------------------------------------------------------------
// loadChartField
// ---------------------------------------------------------------------------

describe('loadChartField', () => {
  it('resolves every declared field slug to a non-empty array matching its declared count', async () => {
    for (const f of CHART_FIELDS) {
      const data = await loadChartField(f.slug)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(f.count)
    }
  })

  it('every loaded chart in a field carries that field label', async () => {
    const first = CHART_FIELDS[0]
    const data = await loadChartField(first.slug)
    for (const c of data) {
      expect(c.field).toBe(first.label)
    }
  })

  it('rejects an unknown slug', async () => {
    await expect(loadChartField('not-a-real-field')).rejects.toThrow()
  })
})
