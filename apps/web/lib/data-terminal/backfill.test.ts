import { describe, expect, it } from 'vitest'
import {
  backfillMarker,
  experimentToDataset,
  needsBackfill,
  type BackfillExperiment,
  type BackfillMeasurement,
} from './backfill'
import { validateDataset } from './dataset'

const exp = (over: Partial<BackfillExperiment> = {}): BackfillExperiment => ({
  id: 'exp1',
  title: 'Growth run',
  description: '',
  xLabel: 'Time',
  yLabel: 'Mass',
  ...over,
})

const m = (over: Partial<BackfillMeasurement> = {}): BackfillMeasurement => ({
  series: '',
  x: 0,
  y: 0,
  note: null,
  ...over,
})

describe('experimentToDataset', () => {
  it('produces a 4-column XY dataset with the right roles and types', () => {
    const ds = experimentToDataset(exp(), [
      m({ x: 1, y: 10, series: 'A', note: 'first' }),
      m({ x: 2, y: 20, series: 'A', note: null }),
    ])

    expect(ds.name).toBe('Growth run')
    expect(ds.tableType).toBe('xy')
    expect(ds.columns.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
    expect(ds.columns.map((c) => c.name)).toEqual(['Time', 'Mass', 'Series', 'Note'])
    expect(ds.columns.map((c) => c.role)).toEqual(['x', 'y', 'group', 'label'])
    expect(ds.columns.map((c) => c.type)).toEqual(['number', 'number', 'text', 'text'])

    expect(ds.rows).toEqual([
      [1, 10, 'A', 'first'],
      [2, 20, 'A', null],
    ])
  })

  it('validates cleanly as an XY table', () => {
    const ds = experimentToDataset(exp(), [m({ x: 1, y: 2, series: 'S', note: 'n' })])
    expect(validateDataset({ columns: ds.columns, rows: ds.rows }, 'xy')).toEqual([])
  })

  it('de-duplicates colliding column names when xLabel equals yLabel', () => {
    // Both default to "x"/"y" in the old model and can be typed identically;
    // validateDataset refuses duplicate names, so the second is suffixed.
    const ds = experimentToDataset(exp({ xLabel: 'value', yLabel: 'value' }), [])
    expect(ds.columns.map((c) => c.name)).toEqual(['value', 'value (2)', 'Series', 'Note'])
    expect(validateDataset({ columns: ds.columns, rows: ds.rows }, 'xy')).toEqual([])
  })

  it('gives blank axis labels a usable name so the dataset stays valid', () => {
    const ds = experimentToDataset(exp({ xLabel: '', yLabel: '   ' }), [])
    expect(ds.columns.slice(0, 2).map((c) => c.name)).toEqual(['X', 'Y'])
    expect(validateDataset({ columns: ds.columns, rows: ds.rows }, 'xy')).toEqual([])
  })

  it('falls back to a default name when the title is empty', () => {
    expect(experimentToDataset(exp({ title: '  ' }), []).name).toBe('Untitled experiment')
  })

  it('yields zero rows but valid columns for an experiment with no measurements', () => {
    const ds = experimentToDataset(exp(), [])
    expect(ds.rows).toEqual([])
    expect(ds.columns).toHaveLength(4)
    expect(validateDataset({ columns: ds.columns, rows: ds.rows }, 'xy')).toEqual([])
  })

  it('preserves a null note as null rather than an empty string', () => {
    const ds = experimentToDataset(exp(), [m({ x: 1, y: 2, series: '', note: null })])
    expect(ds.rows[0]![3]).toBeNull()
  })

  it('is deterministic — the same input yields an identical dataset', () => {
    const measurements = [
      m({ x: 1, y: 10, series: 'A', note: 'a' }),
      m({ x: 2, y: 20, series: 'B', note: null }),
    ]
    const first = experimentToDataset(exp(), measurements)
    const second = experimentToDataset(exp(), measurements)
    expect(second).toEqual(first)
  })
})

describe('needsBackfill', () => {
  it('marks an experiment migrated when its marker is already present', () => {
    const markers = new Set([backfillMarker('exp1')])
    expect(needsBackfill(markers, 'exp1')).toBe(false)
    expect(needsBackfill(markers, 'exp2')).toBe(true)
  })

  it('carries the experiment id in the marker', () => {
    expect(backfillMarker('abc123')).toBe('backfill:exp:abc123')
  })
})
