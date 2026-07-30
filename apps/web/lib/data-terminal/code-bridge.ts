/**
 * "Open in Code mode" bridge (Phase F2) — the TYPED wrapper over the pure
 * generators in `code-bridge-core.mjs`. The logic lives in the `.mjs` so the
 * Node smoke (`scripts/analysis-smoke.mjs`, which can't import `.ts`) runs the
 * SAME code the app does — one source of truth. This file only adds the types.
 *
 * ONE direction: parsing edited code back into the GUI is out of scope forever
 * (plan §Goal). SECURITY lives in the core: the generated script references
 * the dataset the Code lane's worker already injects as `df` — it never
 * embeds rows, and column names are quoted, never interpolated as code.
 */

import * as core from './code-bridge-core.mjs'
import type { SheetsChartSpec } from './sheets-chart'
import type { AnalysisSpec } from './dataset-schema'
import type { ColumnRole } from './dataset'

export interface BridgeColumn {
  id: string
  name: string
  type: 'number' | 'text' | 'date'
  role?: ColumnRole
}
export interface BridgeDataset {
  columns: BridgeColumn[]
  rows: (string | number | null)[][]
}

/**
 * A Sheets `SheetsChartSpec` as a runnable matplotlib script reproducing the
 * recharts chart on the same data: chart type → bar/line/scatter/area/pie, the
 * X + Y columns, title / axis titles / legend / log-Y, and the trendline
 * overlays (matching trendline.ts's fits).
 */
export function chartToPython(spec: SheetsChartSpec, dataset: BridgeDataset): string {
  return core.chartToPython(spec, dataset)
}

/**
 * A Lab `AnalysisSpec` as a runnable matplotlib script reproducing the analysis
 * figure for the selected columns: the SAME chart family the Lab template draws
 * on the SAME data, so the figure matches the GUI figure (plan §6 F-AC).
 */
export function analysisToPython(spec: AnalysisSpec, dataset: BridgeDataset): string {
  return core.analysisToPython(spec, dataset)
}
