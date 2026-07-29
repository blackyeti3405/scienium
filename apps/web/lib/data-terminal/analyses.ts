/**
 * The Analyze dialog's gate (plan §2 MATRIX, Phase D). A table type carries the
 * experimental design, so it decides which analyses may even be OFFERED — a
 * Column table (whose columns are independent groups) can never be handed a
 * correlation or a regression, and an XY table (a continuous x) is exactly
 * where those belong. Getting this gate right is the accessibility mechanism:
 * a student cannot pick an analysis their data cannot support.
 *
 * This module is PURE config — no React, no Python — so the gate is unit-tested
 * directly and the same table drives both the dialog and the tests.
 *
 * The FULL §2 matrix is encoded here even though Phase D1 only IMPLEMENTS three
 * analyses; the rest are `implemented: false` so the dialog shows them disabled
 * ("coming soon") while the gating is already correct for D2's additions.
 */

import type { TableType } from './dataset'

export type AnalysisId =
  // Column — independent groups, one per column
  | 'descriptive'
  | 'normality'
  | 'one-sample-t'
  | 'unpaired-t'
  | 'paired-t'
  | 'mann-whitney'
  | 'wilcoxon'
  | 'one-way-anova'
  | 'kruskal-wallis'
  // XY — a continuous x
  | 'linear-regression'
  | 'correlation'
  | 'nonlinear-regression'
  | 'global-fit'
  | 'interpolate-standard-curve'
  | 'area-under-curve'
  | 'smoothing'
  // Grouped — two grouping factors
  | 'two-way-anova'
  // Contingency — counts in categories
  | 'chi-square'
  | 'fisher-exact'
  | 'relative-risk'
  | 'odds-ratio'
  // Nested — replicates nested in groups
  | 'nested-t'
  | 'nested-anova'
  // Parts of whole
  | 'fraction-of-total'
  // Multiple variables — one row per subject
  | 'correlation-matrix'
  | 'multiple-regression'

/**
 * How the dialog picks the columns this analysis runs on. For the Column-table
 * analyses these are the `y` columns (each is a group); `minGroups`/`maxGroups`
 * are the gate the Run button enforces (t-test = exactly 2, ANOVA >= 3).
 */
export interface AnalysisSelectRule {
  role: 'y' | 'x' | 'group'
  minGroups: number
  maxGroups?: number
  /** Only numeric columns are selectable when true (the values being analyzed). */
  numeric: boolean
}

export interface AnalysisDef {
  label: string
  /** Table types that OFFER this analysis — the gate. */
  tableTypes: TableType[]
  /** Stats Guide entry id (STATS_GUIDE) opened from the result. */
  guideId: string
  /** One line shown under the analysis in the dialog. */
  describe: string
  /** D1 ships three; the rest are gated-but-disabled until D2. */
  implemented: boolean
  select: AnalysisSelectRule
}

const GROUPS = (role: AnalysisSelectRule['role'], min: number, max?: number): AnalysisSelectRule => ({
  role,
  minGroups: min,
  ...(max !== undefined ? { maxGroups: max } : {}),
  numeric: true,
})

export const ANALYSES: Record<AnalysisId, AnalysisDef> = {
  // ── Column ──────────────────────────────────────────────────────────────
  descriptive: {
    label: 'Descriptive statistics',
    tableTypes: ['column'],
    guideId: 'mean',
    describe: 'n, mean, SD, SEM, median, range and 95% CI for each group.',
    implemented: true,
    select: GROUPS('y', 1),
  },
  normality: {
    label: 'Normality (Shapiro-Wilk)',
    tableTypes: ['column'],
    guideId: 'shapiro-wilk',
    describe: 'Test whether each group is drawn from a normal distribution.',
    implemented: false,
    select: GROUPS('y', 1),
  },
  'one-sample-t': {
    label: 'One-sample t-test',
    tableTypes: ['column'],
    guideId: 't-test',
    describe: 'Compare one group against a known/expected value.',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  'unpaired-t': {
    label: 'Unpaired t-test',
    tableTypes: ['column'],
    guideId: 't-test',
    describe: 'Compare the means of two independent groups.',
    implemented: true,
    select: GROUPS('y', 2, 2),
  },
  'paired-t': {
    label: 'Paired t-test',
    tableTypes: ['column'],
    guideId: 'paired-t-test',
    describe: 'Compare two measurements on the same subjects.',
    implemented: true,
    select: GROUPS('y', 2, 2),
  },
  'mann-whitney': {
    label: 'Mann-Whitney U',
    tableTypes: ['column'],
    guideId: 'mann-whitney-u',
    describe: 'Nonparametric comparison of two independent groups.',
    implemented: true,
    select: GROUPS('y', 2, 2),
  },
  wilcoxon: {
    label: 'Wilcoxon signed-rank',
    tableTypes: ['column'],
    guideId: 'wilcoxon-signed-rank',
    describe: 'Nonparametric comparison of two paired measurements.',
    implemented: true,
    select: GROUPS('y', 2, 2),
  },
  'one-way-anova': {
    label: 'One-way ANOVA',
    tableTypes: ['column'],
    guideId: 'anova',
    describe: 'Compare the means of three or more independent groups.',
    implemented: true,
    select: GROUPS('y', 3),
  },
  'kruskal-wallis': {
    label: 'Kruskal-Wallis',
    tableTypes: ['column'],
    guideId: 'kruskal-wallis',
    describe: 'Nonparametric comparison of three or more groups, with Dunn post-hoc.',
    implemented: true,
    select: GROUPS('y', 3),
  },
  // ── XY ──────────────────────────────────────────────────────────────────
  // Every XY analysis reads the ONE X column (role `x`, found by role like the
  // Grouped/Nested analyses do) against ONE selected Y column — so the select
  // rule is exactly one y, not "one or more". The X is implicit, never picked.
  'linear-regression': {
    label: 'Linear regression',
    tableTypes: ['xy'],
    guideId: 'linear-regression',
    describe: 'Fit a straight line; slope, intercept, R-squared, 95% CI band.',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  correlation: {
    label: 'Correlation',
    tableTypes: ['xy'],
    guideId: 'correlation-r',
    describe: 'Pearson + Spearman r, p and 95% CI for the x-y relationship.',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  'nonlinear-regression': {
    label: 'Nonlinear regression',
    tableTypes: ['xy'],
    guideId: 'linear-regression',
    describe: 'Fit a curve from the equation library; SE, 95% CI, R-squared, model comparison.',
    implemented: true,
    // Exactly one Y — a single-curve fit. Multi-dataset global fitting is Phase E2.
    select: GROUPS('y', 1, 1),
  },
  'global-fit': {
    label: 'Global fit (share parameters across curves)',
    tableTypes: ['xy'],
    guideId: 'linear-regression',
    describe:
      'Fit several Y curves at once under one equation, sharing some parameters and letting others vary — with a shared-vs-separate F test.',
    implemented: true,
    // MULTIPLE Y columns — each selected Y is one curve over the shared X. Two is
    // the floor; the acceptance criterion shares parameters across three or more.
    // (E1's nonlinear-regression is the single-Y case; this is the K-curve case.)
    select: GROUPS('y', 2),
  },
  'interpolate-standard-curve': {
    label: 'Interpolate a standard curve',
    tableTypes: ['xy'],
    guideId: 'linear-regression',
    describe: 'Fit a calibration curve, then read an unknown off it with a 95% CI.',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  'area-under-curve': {
    label: 'Area under curve',
    tableTypes: ['xy'],
    guideId: 'linear-regression',
    describe: 'Trapezoidal area under the x-y curve, total and above baseline.',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  smoothing: {
    label: 'Smoothing',
    tableTypes: ['xy'],
    guideId: 'linear-regression',
    describe: 'Moving-average or LOWESS smoothing overlaid on the scatter.',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  // ── Grouped ─────────────────────────────────────────────────────────────
  'two-way-anova': {
    label: 'Two-way ANOVA',
    tableTypes: ['grouped'],
    guideId: 'anova',
    describe: 'Two grouping factors (rows x columns) and their interaction.',
    implemented: true,
    select: GROUPS('y', 2),
  },
  // ── Contingency ─────────────────────────────────────────────────────────
  'chi-square': {
    label: 'Chi-square',
    tableTypes: ['contingency'],
    guideId: 'chi-square',
    describe: 'Test association between two categorical variables.',
    implemented: true,
    select: GROUPS('y', 2),
  },
  'fisher-exact': {
    label: "Fisher's exact",
    tableTypes: ['contingency'],
    guideId: 'fisher-exact',
    describe: 'Exact association test for small counts (2x2).',
    implemented: true,
    select: GROUPS('y', 2, 2),
  },
  'relative-risk': {
    label: 'Relative risk',
    tableTypes: ['contingency'],
    guideId: 'relative-risk',
    describe: 'Risk ratio between two groups (2x2), with 95% CI.',
    implemented: true,
    select: GROUPS('y', 2, 2),
  },
  'odds-ratio': {
    label: 'Odds ratio',
    tableTypes: ['contingency'],
    guideId: 'odds-ratio',
    describe: 'Odds ratio between two groups (2x2), with 95% CI.',
    implemented: true,
    select: GROUPS('y', 2, 2),
  },
  // ── Nested ──────────────────────────────────────────────────────────────
  // guideId points at the PSEUDOREPLICATION entry (Data Quality guide) — the
  // whole reason the nested table type exists is to make n = subjects, not
  // measurements. `select` picks the one VALUE column; the treatment (role
  // `group`) and subject (role `label`) columns are read from the column roles,
  // not the checkbox selection.
  'nested-t': {
    label: 'Nested t-test',
    tableTypes: ['nested'],
    guideId: 'pseudoreplication',
    describe: 'Two treatments with replicates nested in subjects (honest n).',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  'nested-anova': {
    label: 'Nested one-way ANOVA',
    tableTypes: ['nested'],
    guideId: 'pseudoreplication',
    describe: 'Three or more treatments with nested replicates (honest n).',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  // ── Parts of whole ──────────────────────────────────────────────────────
  'fraction-of-total': {
    label: 'Fraction of total',
    tableTypes: ['parts_of_whole'],
    guideId: 'mean',
    describe: 'Each part as a fraction and cumulative percent of the whole.',
    implemented: true,
    select: GROUPS('y', 1, 1),
  },
  // ── Multiple variables ──────────────────────────────────────────────────
  'correlation-matrix': {
    label: 'Correlation matrix',
    tableTypes: ['multiple_variables'],
    guideId: 'correlation-r',
    describe: 'Pairwise Pearson/Spearman r across all selected variables.',
    implemented: true,
    select: GROUPS('y', 2),
  },
  'multiple-regression': {
    label: 'Multiple regression',
    tableTypes: ['multiple_variables'],
    guideId: 'beta-coefficients',
    describe: 'Predict one variable from several others (OLS).',
    implemented: true,
    select: GROUPS('y', 2),
  },
}

/** Every analysis id, for the zod enum that bounds a persisted spec. */
export const ANALYSIS_IDS = Object.keys(ANALYSES) as [AnalysisId, ...AnalysisId[]]

/** The analyses a given table type offers, in registry order. */
export function analysesForTableType(t: TableType): { id: AnalysisId; def: AnalysisDef }[] {
  return (Object.entries(ANALYSES) as [AnalysisId, AnalysisDef][])
    .filter(([, d]) => d.tableTypes.includes(t))
    .map(([id, def]) => ({ id, def }))
}

/** The def for an id, or undefined if the id is unknown (e.g. an old saved spec). */
export function analysisDef(id: string): AnalysisDef | undefined {
  return (ANALYSES as Record<string, AnalysisDef>)[id]
}
