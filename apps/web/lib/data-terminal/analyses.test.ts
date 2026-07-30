import { describe, expect, it } from 'vitest'
import { ANALYSES, ANALYSIS_IDS, analysesForTableType, analysisDef, type AnalysisId } from './analyses'
import { EQUATIONS, EQUATION_IDS, equationDef, equationsByDomain } from './equations'
import { AnalysisOptionsSchema } from './dataset-schema'
import { STATS_GUIDE } from '@/content/data-terminal/stats-guide'
import { DATA_QUALITY_GUIDE } from '@/content/data-terminal/data-quality-guide'
import type { TableType } from './dataset'

/**
 * The §2 gating matrix — the accessibility mechanism. These are the acceptance
 * assertions for Phase D: the table type must decide which analyses appear, and
 * an analysis a table cannot support must never be offered.
 *
 * D1 shipped three Column analyses, D2a five more Column analyses, and D2b turned
 * on the Grouped (two-way ANOVA), Nested (nested t / nested ANOVA) and Contingency
 * (chi-square / Fisher / relative risk / odds ratio) analyses. The rest of the §2
 * matrix (XY, Parts-of-whole, Multiple-variables) is still gated-but-disabled.
 */
describe('analysesForTableType — the §2 gate', () => {
  it('a Column table offers t-test AND one-way ANOVA', () => {
    const ids = analysesForTableType('column').map((a) => a.id)
    expect(ids).toContain('unpaired-t')
    expect(ids).toContain('one-way-anova')
    expect(ids).toContain('descriptive')
  })

  it('a Column table does NOT offer correlation or regression', () => {
    const ids = analysesForTableType('column').map((a) => a.id)
    expect(ids).not.toContain('correlation')
    expect(ids).not.toContain('linear-regression')
    expect(ids).not.toContain('nonlinear-regression')
  })

  it('an XY table offers regression and correlation', () => {
    const ids = analysesForTableType('xy').map((a) => a.id)
    expect(ids).toContain('linear-regression')
    expect(ids).toContain('correlation')
  })

  it('an XY table does NOT offer the group-comparison analyses', () => {
    const ids = analysesForTableType('xy').map((a) => a.id)
    expect(ids).not.toContain('unpaired-t')
    expect(ids).not.toContain('one-way-anova')
  })

  it('contingency offers chi-square, nested offers a nested ANOVA', () => {
    expect(analysesForTableType('contingency').map((a) => a.id)).toContain('chi-square')
    expect(analysesForTableType('nested').map((a) => a.id)).toContain('nested-anova')
  })
})

describe('the implemented set (D1 + D2a + D2b)', () => {
  it('every analysis D1/D2a/D2b shipped is implemented:true', () => {
    // Membership, not exact-array-equality: a future phase adding MORE
    // implemented analyses should not break this test, only removing one of
    // these should.
    const expectedImplemented: AnalysisId[] = [
      // D1
      'descriptive',
      'one-sample-t',
      'unpaired-t',
      // D2a
      'paired-t',
      'mann-whitney',
      'wilcoxon',
      'one-way-anova',
      'kruskal-wallis',
      // D2b
      'two-way-anova',
      'chi-square',
      'fisher-exact',
      'relative-risk',
      'odds-ratio',
      'nested-t',
      'nested-anova',
    ]
    for (const id of expectedImplemented) {
      expect(ANALYSES[id].implemented, id).toBe(true)
    }
  })

  it('Column still offers t-test + ANOVA and NOT correlation, even among only the implemented ones', () => {
    const implementedColumn = analysesForTableType('column')
      .filter((a) => a.def.implemented)
      .map((a) => a.id)
    expect(implementedColumn).toEqual(expect.arrayContaining(['unpaired-t', 'one-way-anova']))
    expect(implementedColumn).not.toContain('correlation')
    expect(implementedColumn).not.toContain('linear-regression')
  })

  it('the column-count gate matches each Column analysis', () => {
    expect(ANALYSES['one-sample-t'].select).toMatchObject({ minGroups: 1, maxGroups: 1 })
    expect(ANALYSES['unpaired-t'].select).toMatchObject({ minGroups: 2, maxGroups: 2 })
    expect(ANALYSES['paired-t'].select).toMatchObject({ minGroups: 2, maxGroups: 2 })
    expect(ANALYSES['mann-whitney'].select).toMatchObject({ minGroups: 2, maxGroups: 2 })
    expect(ANALYSES['wilcoxon'].select).toMatchObject({ minGroups: 2, maxGroups: 2 })
    expect(ANALYSES['one-way-anova'].select).toMatchObject({ minGroups: 3 })
    expect(ANALYSES['kruskal-wallis'].select).toMatchObject({ minGroups: 3 })
    expect(ANALYSES['descriptive'].select).toMatchObject({ minGroups: 1 })
  })
})

describe('D2b gating — Grouped / Nested / Contingency onto the right table type', () => {
  const idsFor = (t: TableType) => analysesForTableType(t).map((a) => a.id)
  const implementedFor = (t: TableType) =>
    analysesForTableType(t)
      .filter((a) => a.def.implemented)
      .map((a) => a.id)

  it('Grouped offers two-way ANOVA (implemented) and nothing else yet', () => {
    expect(implementedFor('grouped')).toEqual(['two-way-anova'])
  })

  it('Nested offers nested t + nested ANOVA (implemented)', () => {
    expect(implementedFor('nested').sort()).toEqual(['nested-anova', 'nested-t'])
  })

  it('Contingency offers chi-square, Fisher, relative risk, odds ratio (all implemented)', () => {
    expect(implementedFor('contingency').sort()).toEqual([
      'chi-square',
      'fisher-exact',
      'odds-ratio',
      'relative-risk',
    ])
  })

  it('a Column table offers t-test and ANOVA but NOT the D2b table-type analyses', () => {
    const column = idsFor('column')
    expect(column).toContain('unpaired-t')
    expect(column).toContain('one-way-anova')
    // None of the table-type-specific D2b analyses leak onto Column.
    for (const leak of [
      'two-way-anova',
      'nested-t',
      'nested-anova',
      'chi-square',
      'fisher-exact',
      'relative-risk',
      'odds-ratio',
    ] as AnalysisId[]) {
      expect(column).not.toContain(leak)
    }
  })

  it('two-way ANOVA is ONLY on Grouped', () => {
    expect(ANALYSES['two-way-anova'].tableTypes).toEqual(['grouped'])
    for (const t of ['column', 'nested', 'contingency', 'xy'] as TableType[]) {
      expect(idsFor(t)).not.toContain('two-way-anova')
    }
  })

  it('nested analyses are ONLY on Nested', () => {
    expect(ANALYSES['nested-t'].tableTypes).toEqual(['nested'])
    expect(ANALYSES['nested-anova'].tableTypes).toEqual(['nested'])
    for (const t of ['column', 'grouped', 'contingency', 'xy'] as TableType[]) {
      expect(idsFor(t)).not.toContain('nested-anova')
      expect(idsFor(t)).not.toContain('nested-t')
    }
  })

  it('contingency analyses are ONLY on Contingency', () => {
    for (const id of ['chi-square', 'fisher-exact', 'relative-risk', 'odds-ratio'] as AnalysisId[]) {
      expect(ANALYSES[id].tableTypes).toEqual(['contingency'])
    }
    for (const t of ['column', 'grouped', 'nested', 'xy'] as TableType[]) {
      for (const id of ['chi-square', 'fisher-exact', 'relative-risk', 'odds-ratio']) {
        expect(idsFor(t)).not.toContain(id)
      }
    }
  })
})

describe('D2b selection rules', () => {
  it('nested t / nested ANOVA select EXACTLY ONE value column (the group comes from role)', () => {
    for (const id of ['nested-t', 'nested-anova'] as AnalysisId[]) {
      expect(ANALYSES[id].select).toMatchObject({ role: 'y', minGroups: 1, maxGroups: 1 })
    }
  })

  it('two-way ANOVA needs at least two column groups (factor B levels)', () => {
    expect(ANALYSES['two-way-anova'].select.minGroups).toBe(2)
    expect(ANALYSES['two-way-anova'].select.maxGroups).toBeUndefined()
  })

  it('Fisher / relative risk / odds ratio are 2x2 — exactly two count columns', () => {
    for (const id of ['fisher-exact', 'relative-risk', 'odds-ratio'] as AnalysisId[]) {
      expect(ANALYSES[id].select).toMatchObject({ minGroups: 2, maxGroups: 2 })
    }
  })
})

describe('D2c gating — XY / Parts-of-whole / Multiple-variables onto the right table type', () => {
  const idsFor = (t: TableType) => analysesForTableType(t).map((a) => a.id)
  const implementedFor = (t: TableType) =>
    analysesForTableType(t)
      .filter((a) => a.def.implemented)
      .map((a) => a.id)

  it('the D2c analyses are implemented:true', () => {
    for (const id of [
      'correlation',
      'linear-regression',
      'area-under-curve',
      'smoothing',
      'fraction-of-total',
      'correlation-matrix',
      'multiple-regression',
    ] as AnalysisId[]) {
      expect(ANALYSES[id].implemented, id).toBe(true)
    }
  })

  it('Phase E is implemented on XY (nonlinear regression + standard-curve interpolation)', () => {
    expect(ANALYSES['nonlinear-regression'].implemented).toBe(true)
    expect(ANALYSES['interpolate-standard-curve'].implemented).toBe(true)
    expect(idsFor('xy')).toContain('nonlinear-regression')
    expect(idsFor('xy')).toContain('interpolate-standard-curve')
    // They are XY-only — never offered to a Column/Grouped table (the §2 gate).
    for (const id of ['nonlinear-regression', 'interpolate-standard-curve'] as AnalysisId[]) {
      expect(ANALYSES[id].tableTypes).toEqual(['xy'])
    }
    for (const t of ['column', 'grouped', 'nested', 'contingency', 'parts_of_whole'] as TableType[]) {
      expect(idsFor(t)).not.toContain('nonlinear-regression')
      expect(idsFor(t)).not.toContain('interpolate-standard-curve')
    }
  })

  it('the fit analyses select EXACTLY ONE Y column (single-curve fit; global fitting is E2)', () => {
    for (const id of ['nonlinear-regression', 'interpolate-standard-curve'] as AnalysisId[]) {
      expect(ANALYSES[id].select).toMatchObject({ role: 'y', minGroups: 1, maxGroups: 1 })
    }
  })

  it('Phase E2 global-fit gates on XY and accepts MULTIPLE Y columns (K curves)', () => {
    expect(ANALYSES['global-fit'].implemented).toBe(true)
    // XY-only, exactly like the other fit analyses (the §2 gate).
    expect(ANALYSES['global-fit'].tableTypes).toEqual(['xy'])
    expect(idsFor('xy')).toContain('global-fit')
    for (const t of ['column', 'grouped', 'nested', 'contingency', 'parts_of_whole', 'multiple_variables'] as TableType[]) {
      expect(idsFor(t)).not.toContain('global-fit')
    }
    // MULTIPLE Y curves: at least two, no upper cap — this is the difference from
    // E1's single-Y nonlinear-regression (maxGroups: 1).
    expect(ANALYSES['global-fit'].select).toMatchObject({ role: 'y', minGroups: 2 })
    expect(ANALYSES['global-fit'].select.maxGroups).toBeUndefined()
  })

  it('an XY table offers correlation + linear regression, and a Column table NEVER does', () => {
    const xy = idsFor('xy')
    expect(xy).toContain('correlation')
    expect(xy).toContain('linear-regression')
    expect(xy).toContain('area-under-curve')
    expect(xy).toContain('smoothing')
    const column = idsFor('column')
    for (const id of ['correlation', 'linear-regression', 'area-under-curve', 'smoothing'] as AnalysisId[]) {
      expect(column).not.toContain(id)
    }
  })

  it('correlation / linear-regression are XY-only (the mirror of Column-excludes-correlation)', () => {
    for (const id of ['correlation', 'linear-regression', 'area-under-curve', 'smoothing'] as AnalysisId[]) {
      expect(ANALYSES[id].tableTypes).toEqual(['xy'])
    }
    for (const t of ['column', 'grouped', 'nested', 'contingency', 'parts_of_whole', 'multiple_variables'] as TableType[]) {
      expect(idsFor(t)).not.toContain('correlation')
      expect(idsFor(t)).not.toContain('linear-regression')
    }
  })

  it('fraction-of-total is Parts-of-whole only (and the only thing it offers)', () => {
    expect(ANALYSES['fraction-of-total'].tableTypes).toEqual(['parts_of_whole'])
    expect(implementedFor('parts_of_whole')).toEqual(['fraction-of-total'])
    for (const t of ['xy', 'column', 'multiple_variables'] as TableType[]) {
      expect(idsFor(t)).not.toContain('fraction-of-total')
    }
  })

  it('correlation-matrix + multiple-regression are Multiple-variables only', () => {
    expect(ANALYSES['correlation-matrix'].tableTypes).toEqual(['multiple_variables'])
    expect(ANALYSES['multiple-regression'].tableTypes).toEqual(['multiple_variables'])
    expect(implementedFor('multiple_variables').sort()).toEqual(['correlation-matrix', 'multiple-regression'])
    for (const t of ['xy', 'column', 'parts_of_whole'] as TableType[]) {
      expect(idsFor(t)).not.toContain('correlation-matrix')
      expect(idsFor(t)).not.toContain('multiple-regression')
    }
  })

  it('the XY single-value analyses select EXACTLY ONE y column (X comes from role)', () => {
    for (const id of ['correlation', 'linear-regression', 'area-under-curve', 'smoothing', 'fraction-of-total'] as AnalysisId[]) {
      expect(ANALYSES[id].select).toMatchObject({ role: 'y', minGroups: 1, maxGroups: 1 })
    }
  })

  it('the Multiple-variables analyses need at least two columns', () => {
    expect(ANALYSES['correlation-matrix'].select).toMatchObject({ role: 'y', minGroups: 2 })
    expect(ANALYSES['multiple-regression'].select).toMatchObject({ role: 'y', minGroups: 2 })
  })
})

describe('guide links resolve (STATS_GUIDE ∪ DATA_QUALITY_GUIDE)', () => {
  it('every analysis guideId exists in a guide (no dead links)', () => {
    const has = (id: string) => STATS_GUIDE.some((c) => c.id === id) || DATA_QUALITY_GUIDE.some((c) => c.id === id)
    for (const id of ANALYSIS_IDS) {
      expect(has(ANALYSES[id].guideId), `${id} -> ${ANALYSES[id].guideId}`).toBe(true)
    }
  })

  it('nested analyses link the PSEUDOREPLICATION guide entry (the whole point of Nested), resolved via Data Quality', () => {
    expect(ANALYSES['nested-t'].guideId).toBe('pseudoreplication')
    expect(ANALYSES['nested-anova'].guideId).toBe('pseudoreplication')
    expect(DATA_QUALITY_GUIDE.some((c) => c.id === 'pseudoreplication')).toBe(true)
    // Proves the OR-across-guides is load-bearing: STATS_GUIDE alone does NOT have this id.
    expect(STATS_GUIDE.some((c) => c.id === 'pseudoreplication')).toBe(false)
    expect(analysisDef('nested-anova')?.guideId).toBe('pseudoreplication')
  })

  it('analysisDef looks up by id and is undefined for an unknown id', () => {
    expect(analysisDef('unpaired-t')?.label).toBe('Unpaired t-test')
    expect(analysisDef('not-a-real-analysis')).toBeUndefined()
  })
})

/**
 * The Phase E1 equation library (plan §5). This TS registry is the metadata the
 * picker + zod enum use; the Python `_EQUATIONS` (analysis-templates.mjs) holds
 * the models + initial-value rules and is proven by scripts/analysis-smoke.mjs.
 * Here we only assert the registry is WELL-FORMED — every equation has a domain,
 * a label, and at least one parameter — plus that the acceptance-anchor
 * equations (4-parameter Hill, Michaelis-Menten) carry exactly their parameters.
 */
describe('the equation library registry is well-formed', () => {
  it('every equation has a domain, a label, and a non-empty parameter list', () => {
    for (const id of EQUATION_IDS) {
      const def = EQUATIONS[id]
      expect(def.domain, id).toBeTruthy()
      expect(def.label, id).toBeTruthy()
      expect(Array.isArray(def.params), id).toBe(true)
      expect(def.params.length, id).toBeGreaterThan(0)
      // Parameter names are unique within an equation (they index the constraint
      // arrays by position, so a duplicate would be an ambiguous control).
      expect(new Set(def.params).size, id).toBe(def.params.length)
    }
  })

  it('the acceptance-anchor equations carry exactly their parameters', () => {
    // Variable-slope 4-parameter dose-response (the headline AC): Bottom, Top,
    // logEC50, HillSlope.
    expect(equationDef('dr-4param')?.params).toEqual(['Bottom', 'Top', 'logEC50', 'HillSlope'])
    expect(equationDef('dr-3param')?.params).toEqual(['Bottom', 'Top', 'logEC50'])
    expect(equationDef('michaelis-menten')?.params).toEqual(['Vmax', 'Km'])
    expect(equationDef('gaussian')?.params).toEqual(['Amp', 'Center', 'Width'])
  })

  it('the core covers every named §5 domain, and ids are unique', () => {
    const domains = new Set(EQUATION_IDS.map((id) => EQUATIONS[id].domain))
    for (const d of [
      'Lines',
      'Exponential',
      'Dose-response',
      'Enzyme kinetics',
      'Binding',
      'Growth',
      'Peaks',
      'Oscillation',
      'Power',
    ]) {
      expect(domains.has(d as never), d).toBe(true)
    }
    expect(new Set(EQUATION_IDS).size).toBe(EQUATION_IDS.length)
  })

  it('equationsByDomain groups every equation exactly once, in domain order', () => {
    const grouped = equationsByDomain()
    const flat = grouped.flatMap((g) => g.equations.map((e) => e.id))
    expect(flat.sort()).toEqual([...EQUATION_IDS].sort())
    // Each group's equations all share the group's domain.
    for (const g of grouped) {
      for (const { id } of g.equations) expect(EQUATIONS[id].domain).toBe(g.domain)
    }
  })

  it('equationDef is undefined for an unknown id', () => {
    expect(equationDef('not-a-real-equation')).toBeUndefined()
  })
})

/**
 * Phase E2 global-fit options (plan §5.1). The three-state per-parameter mode is
 * a BOUNDED ENUM and the F-test parameter is a NUMBER — the same closed-shape
 * guarantee every analysis option carries, so nothing free-form ever reaches the
 * Python fit engine.
 */
describe('global-fit options are enum/number-bounded (no free string reaches Python)', () => {
  const ok = (options: Record<string, unknown>) =>
    AnalysisOptionsSchema.safeParse(options).success

  it('paramModes accepts only shared/separate/fixed', () => {
    expect(ok({ paramModes: ['shared', 'separate', 'fixed', 'shared'] })).toBe(true)
    expect(ok({ paramModes: [] })).toBe(true)
    // Anything outside the three states is rejected — including a code payload.
    expect(ok({ paramModes: ['global'] })).toBe(false)
    expect(ok({ paramModes: ['__import__("os").system("rm -rf /")'] })).toBe(false)
    expect(ok({ paramModes: [1] })).toBe(false)
  })

  it('fTestParam is a non-negative integer index, never a name', () => {
    expect(ok({ fTestParam: 2 })).toBe(true)
    expect(ok({ fTestParam: 0 })).toBe(true)
    expect(ok({ fTestParam: -1 })).toBe(false)
    expect(ok({ fTestParam: 1.5 })).toBe(false)
    expect(ok({ fTestParam: 'logEC50' })).toBe(false)
  })

  it('a full global-fit option set (equation + modes + weighting + F test) validates', () => {
    expect(
      ok({
        equationId: 'dr-4param',
        paramModes: ['shared', 'shared', 'separate', 'shared'],
        weighting: '1/Y2',
        fTestParam: 2,
        fixValues: [null, null, null, 1],
        boundsLow: [0, null, null, null],
      }),
    ).toBe(true)
    // An unknown key is still rejected (mass-assignment guard, .strict()).
    expect(ok({ paramModes: ['shared'], evil: 'x=1' })).toBe(false)
  })
})
