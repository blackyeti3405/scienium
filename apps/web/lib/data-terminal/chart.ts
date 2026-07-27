/**
 * Pure, DOM-free chart-shaping for the Data Terminal (no React, no recharts import) —
 * fully unit-testable, unlike the component it's extracted from.
 */

export interface ChartPoint {
  x: number
  y: number
  series: string
}

export type ChartRow = { x: number } & Record<string, number>

export interface ChartShape {
  chartData: ChartRow[]
  seriesNames: string[]
  /**
   * Count of points that share an (x, series) key with an earlier point in the
   * input. recharts' wide/pivoted row format (one row per x, one column per
   * series) can hold only ONE y per (x, series) — a second point at the same
   * key overwrites the first in the chart's row object, even though every point
   * is still a real row in the measurements table. This is not a bug to
   * "de-duplicate" away (the measurements are the student's own recorded data,
   * kept in full in the table); it is a real chart limitation, and the caller
   * must warn the student rather than let the chart silently disagree with the
   * table it sits next to.
   */
  duplicateCount: number
}

/** Builds the recharts-ready rows from a flat measurement list, x-ascending. */
export function buildChartData(points: ChartPoint[]): ChartShape {
  const seriesNames = Array.from(new Set(points.map((p) => p.series || 'series')))
  const byX = new Map<number, ChartRow>()
  const seen = new Set<string>()
  let duplicateCount = 0

  for (const p of points) {
    const seriesKey = p.series || 'series'
    const dupKey = `${p.x}::${seriesKey}`
    if (seen.has(dupKey)) {
      duplicateCount++
    } else {
      seen.add(dupKey)
    }
    const row = byX.get(p.x) ?? ({ x: p.x } as ChartRow)
    row[seriesKey] = p.y // last point at this (x, series) wins the drawn value
    byX.set(p.x, row)
  }

  return {
    chartData: Array.from(byX.values()).sort((a, b) => a.x - b.x),
    seriesNames,
    duplicateCount,
  }
}
