import { describe, it, expect } from 'vitest'
import { recipeToDataset } from './recipe'
import { validateDataset } from './dataset'
import type { ChartConcept } from './charts-guide'

/** A minimal ChartConcept — only the fields recipeToDataset reads matter. */
function concept(partial: Partial<ChartConcept>): ChartConcept {
  return {
    id: 'x',
    title: 'Test recipe',
    field: 'Test',
    plotType: 'Scatter plot',
    description: '',
    dataNeeded: [],
    whatItTellsYou: '',
    exampleSvg: '',
    ...partial,
  }
}

describe('recipeToDataset', () => {
  it('maps an XY recipe: first numeric column X, rest Y, units carried', () => {
    const r = recipeToDataset(
      concept({
        title: 'Cooling curve',
        plotType: 'Scatter plot (temperature vs. time)',
        dataNeeded: [
          { name: 'Time', unit: 's' },
          { name: 'Temperature', unit: '°C' },
        ],
      }),
    )
    expect(r.name).toBe('Cooling curve')
    expect(r.tableType).toBe('xy')
    expect(r.columns.map((c) => [c.name, c.role, c.type, c.unit])).toEqual([
      ['Time', 'x', 'number', 's'],
      ['Temperature', 'y', 'number', '°C'],
    ])
    // A structurally coherent dataset (unique names, one X, roles legal).
    expect(validateDataset({ columns: r.columns, rows: [] }, r.tableType)).toEqual([])
    // Starter chart is shaped like the recipe and references real columns.
    expect(r.charts).toHaveLength(1)
    expect(r.charts![0]).toMatchObject({ type: 'scatter', xColumnId: 'c1', yColumnIds: ['c2'] })
  })

  it('treats a "category" unit as a text label, not a number', () => {
    const r = recipeToDataset(
      concept({
        plotType: 'Bar chart (one bar per site, height = diversity)',
        dataNeeded: [
          { name: 'Site or treatment', unit: 'category' },
          { name: 'Diversity index', unit: 'unitless' },
        ],
      }),
    )
    // The category becomes a text LABEL (typing "A" into a number column would
    // null it), the numeric becomes X. Its "unit" is dropped (labels have none).
    expect(r.columns[0]).toMatchObject({ name: 'Site or treatment', type: 'text', role: 'label' })
    expect(r.columns[0]!.unit).toBeUndefined()
    // "unitless" is a placeholder, not a unit — dropped.
    expect(r.columns[1]).toMatchObject({ name: 'Diversity index', type: 'number', role: 'x' })
    expect(r.columns[1]!.unit).toBeUndefined()
    expect(validateDataset({ columns: r.columns, rows: [] }, 'xy')).toEqual([])
  })

  it('maps a pie recipe to a parts-of-whole table with a label + value', () => {
    const r = recipeToDataset(
      concept({
        title: 'Energy mix',
        plotType: 'Pie chart of generation share',
        dataNeeded: [
          { name: 'Source', unit: 'category' },
          { name: 'Share', unit: '%' },
        ],
      }),
    )
    expect(r.tableType).toBe('parts_of_whole')
    // Parts-of-whole has no X role: the label names the part, the number is the amount.
    expect(r.columns.map((c) => [c.role, c.type])).toEqual([
      ['label', 'text'],
      ['y', 'number'],
    ])
    expect(r.charts![0]).toMatchObject({ type: 'pie', xColumnId: 'c1', yColumnIds: ['c2'] })
    expect(validateDataset({ columns: r.columns, rows: [] }, r.tableType)).toEqual([])
  })

  it('picks a line chart for a time-series plot and dedupes repeated names', () => {
    const r = recipeToDataset(
      concept({
        plotType: 'Line plot over time',
        dataNeeded: [
          { name: 'Day', unit: 'd' },
          { name: 'Mass', unit: 'g' },
          { name: 'Mass', unit: 'g' },
        ],
      }),
    )
    expect(r.charts![0].type).toBe('line')
    // Duplicate names are suffixed so validateDataset's unique-name rule holds.
    expect(r.columns.map((c) => c.name)).toEqual(['Day', 'Mass', 'Mass 2'])
    expect(validateDataset({ columns: r.columns, rows: [] }, 'xy')).toEqual([])
  })

  it('falls back to shaped starter columns for an empty recipe', () => {
    const r = recipeToDataset(concept({ dataNeeded: [] }))
    // Same X/Y starter "New dataset" would give, so the student still lands on a table.
    expect(r.columns.map((c) => c.role)).toEqual(['x', 'y'])
    expect(validateDataset({ columns: r.columns, rows: [] }, r.tableType)).toEqual([])
  })

  it('omits the starter chart when there is nothing numeric to plot', () => {
    const r = recipeToDataset(
      concept({
        plotType: 'Bar chart',
        dataNeeded: [
          { name: 'Category', unit: 'category' },
          { name: 'Group', unit: 'name' },
        ],
      }),
    )
    expect(r.charts).toBeUndefined()
  })
})
