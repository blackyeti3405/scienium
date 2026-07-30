import { z } from 'zod'
import { requestJson } from '@/lib/api/client'
import {
  AnalysesSchema,
  ChartsSchema,
  LayoutsSchema,
  ScriptsSchema,
  TABLE_TYPE_VALUES,
  type AnalysisSpec,
  type CodeScriptSpec,
  type LayoutSpec,
} from '@/lib/data-terminal/dataset-schema'
import type { ColumnSpec, DataRow, TableType } from '@/lib/data-terminal/dataset'
import type { SheetsChartSpec } from '@/lib/data-terminal/sheets-chart'

/**
 * Client for the dataset routes. The response schemas mirror the route
 * selects exactly — a list row deliberately has NO `rows`, so a component
 * cannot accidentally read cell data the server never sent.
 */

const columnSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string().optional(),
  type: z.enum(['number', 'text', 'date']),
  role: z.enum(['x', 'y', 'yErr', 'xErr', 'group', 'label', 'ignore']),
  subcolumnOf: z.string().optional(),
  pairedWith: z.string().optional(),
  formula: z.string().optional(),
})

const cellSchema = z.union([z.string(), z.number(), z.null()])

const summarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tableType: z.enum(TABLE_TYPE_VALUES),
  sourceFilename: z.string().nullable(),
  columns: z.array(columnSchema),
  rowCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// `charts`/`scripts`/`analyses`/`layouts` are nullable (NULL until the first is
// created) and live only on the full record — never on the light list summary.
const fullSchema = summarySchema.extend({
  rows: z.array(z.array(cellSchema)),
  charts: ChartsSchema.nullish(),
  scripts: ScriptsSchema.nullish(),
  analyses: AnalysesSchema.nullish(),
  layouts: LayoutsSchema.nullish(),
})

export type DatasetSummary = z.infer<typeof summarySchema>
export type DatasetFull = z.infer<typeof fullSchema>

const okSchema = z.object({ ok: z.literal(true) })

export function listDatasets() {
  return requestJson(
    '/api/data-terminal/datasets',
    z.object({ datasets: z.array(summarySchema) }),
  )
}

export function getDataset(id: string) {
  return requestJson(`/api/data-terminal/datasets/${id}`, z.object({ dataset: fullSchema }))
}

export function createDataset(body: {
  name: string
  tableType: TableType
  sourceFilename?: string
  columns?: ColumnSpec[]
  rows?: DataRow[]
  charts?: SheetsChartSpec[]
  scripts?: CodeScriptSpec[]
  analyses?: AnalysisSpec[]
  layouts?: LayoutSpec[]
}) {
  return requestJson('/api/data-terminal/datasets', z.object({ dataset: summarySchema }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * `expectedUpdatedAt` is the stamp the client loaded. The server refuses with
 * 409 when the row moved underneath it, so a teammate's save is never silently
 * discarded — the caller surfaces that as "reload to see their changes".
 */
export function updateDataset(
  id: string,
  body: {
    name?: string
    tableType?: TableType
    columns?: ColumnSpec[]
    rows?: DataRow[]
    charts?: SheetsChartSpec[]
    scripts?: CodeScriptSpec[]
    analyses?: AnalysisSpec[]
    layouts?: LayoutSpec[]
    expectedUpdatedAt?: string
  },
) {
  return requestJson(`/api/data-terminal/datasets/${id}`, z.object({ dataset: fullSchema }), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteDataset(id: string): Promise<void> {
  await requestJson(`/api/data-terminal/datasets/${id}`, okSchema, { method: 'DELETE' })
}
