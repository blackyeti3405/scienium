import { describe, it, expect } from 'vitest'
import { buildChartData } from './chart'

describe('buildChartData', () => {
  it('gives distinct series at the same x their own columns (not a duplicate)', () => {
    const { chartData, seriesNames, duplicateCount } = buildChartData([
      { x: 5, y: 10, series: 'Trial A' },
      { x: 5, y: 40, series: 'Trial B' },
    ])
    expect(duplicateCount).toBe(0)
    expect(chartData).toEqual([{ x: 5, 'Trial A': 10, 'Trial B': 40 }])
    expect(seriesNames.sort()).toEqual(['Trial A', 'Trial B'])
  })

  // §0.7's exact finding, measured: "Duplicate (x, series) points overwrite
  // visually although the table retains them, so the chart can misrepresent
  // data." Reproduced here against the real extracted logic, not a restatement.
  it('flags a duplicate (x, series) pair and the chart keeps only the later y', () => {
    const points = [
      { x: 5, y: 10, series: 'Trial A' },
      { x: 5, y: 40, series: 'Trial A' }, // duplicate (x=5, series="Trial A")
      { x: 6, y: 12, series: 'Trial A' },
    ]
    const { chartData, duplicateCount } = buildChartData(points)
    // The table (rendered directly from `points`, untouched by this function)
    // would still show all 3 rows — this function only shapes the CHART.
    expect(points.length).toBe(3)
    expect(chartData).toHaveLength(2) // x=5 collapsed to one row
    expect(chartData.find((r) => r.x === 5)).toEqual({ x: 5, 'Trial A': 40 })
    expect(duplicateCount).toBe(1)
  })

  it('counts every extra point sharing a key, not just one', () => {
    const { duplicateCount } = buildChartData([
      { x: 1, y: 1, series: 'A' },
      { x: 1, y: 2, series: 'A' },
      { x: 1, y: 3, series: 'A' },
    ])
    expect(duplicateCount).toBe(2) // 2nd and 3rd both collide with the 1st
  })

  it('treats an empty series label as one shared "series" bucket', () => {
    const { duplicateCount, seriesNames } = buildChartData([
      { x: 1, y: 1, series: '' },
      { x: 1, y: 2, series: '' },
    ])
    expect(seriesNames).toEqual(['series'])
    expect(duplicateCount).toBe(1)
  })

  it('handles no points', () => {
    expect(buildChartData([])).toEqual({ chartData: [], seriesNames: [], duplicateCount: 0 })
  })
})
