/**
 * Pure helpers for Lab mode (plan §5, §7 risk 5) — no React, no Python, so the
 * recalculation-chain signature and the dialog's Run gate are unit-tested
 * directly.
 *
 * The load-bearing piece is `datasetSignature`: a Lab result is DERIVED from
 * the dataset, so it must never be shown against data that has since changed.
 * The signature changes whenever a column or a cell does, so the results sheet
 * can mark a cached result stale and offer a re-run instead of silently
 * displaying yesterday's numbers.
 */

import type { AnalysisDef } from './analyses'
import type { ColumnSpec, DataRow } from './dataset'

/**
 * A cheap content signature over the columns and rows. Changes when any
 * column's id/role/type/name changes or any cell changes, which is exactly when
 * a cached analysis result becomes stale.
 *
 * ponytail: FNV-1a 32-bit, so a signature COLLISION (two different datasets
 * hashing equal) is theoretically possible and would miss a stale flag. At
 * 1-in-4-billion for a real edit this is an acceptable ceiling for a classroom
 * tool; upgrade to a 64-bit hash only if a missed re-run is ever observed.
 */
export function datasetSignature(columns: ColumnSpec[], rows: DataRow[]): string {
  let h = 2166136261
  const push = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  for (const c of columns) {
    push(c.id)
    push('~')
    push(c.role)
    push('~')
    push(c.type)
    push('~')
    push(c.name)
    push('|')
  }
  push('#')
  for (const row of rows) {
    for (const v of row) {
      push(v === null || v === undefined ? '' : String(v))
      push(',')
    }
    push(';')
  }
  return `${(h >>> 0).toString(36)}:${rows.length}:${columns.length}`
}

/**
 * The columns the dialog offers for this analysis: those whose role matches the
 * analysis's `select.role` (and are numeric when the rule requires it). For the
 * D1 Column analyses this is the set of Y columns — each is one group.
 */
export function selectableColumns(columns: ColumnSpec[], def: AnalysisDef): ColumnSpec[] {
  return columns.filter(
    (c) => c.role === def.select.role && (!def.select.numeric || c.type === 'number'),
  )
}

/**
 * Why the Run button is disabled, or null when the current selection is valid.
 * Enforces the analysis's group count (t-test = exactly 2, ANOVA >= 3) so the
 * gate lives with the config, not scattered in the dialog.
 */
export function analysisSelectionError(def: AnalysisDef, columnIds: string[]): string | null {
  const n = columnIds.length
  const { minGroups, maxGroups } = def.select
  if (n < minGroups) {
    const need = maxGroups === minGroups ? `exactly ${minGroups}` : `at least ${minGroups}`
    return `Select ${need} column${minGroups === 1 ? '' : 's'} (${n} selected).`
  }
  if (maxGroups !== undefined && n > maxGroups) {
    return `Select at most ${maxGroups} column${maxGroups === 1 ? '' : 's'} (${n} selected).`
  }
  return null
}
