import { describe, expect, it } from 'vitest'
import { parseDatasetTable, spreadsheetColumnName, toDatasetCsv } from './csv'
import { validateDataset } from './dataset'

describe('parseDatasetTable — header detection', () => {
  it('uses a header row when text titles sit over numeric data', () => {
    const out = parseDatasetTable('Time,Mass\n1,10\n2,20', 'xy')
    expect(out.usedHeader).toBe(true)
    expect(out.columns.map((c) => c.name)).toEqual(['Time', 'Mass'])
    expect(out.rows).toEqual([
      [1, 10],
      [2, 20],
    ])
  })

  it('treats an all-numeric first row as data, not titles', () => {
    const out = parseDatasetTable('1,10\n2,20', 'xy')
    expect(out.usedHeader).toBe(false)
    expect(out.rows).toHaveLength(2)
    expect(out.columns.map((c) => c.name)).toEqual(['A', 'B'])
  })

  it('can be overridden when the guess would be wrong', () => {
    // An all-text table gives the detector no evidence, so the student says so.
    const out = parseDatasetTable('Site,Habitat\nNorth,Forest\nSouth,Meadow', 'column', true)
    expect(out.usedHeader).toBe(true)
    expect(out.columns.map((c) => c.name)).toEqual(['Site', 'Habitat'])
    expect(out.rows).toEqual([
      ['North', 'Forest'],
      ['South', 'Meadow'],
    ])
  })
})

describe('parseDatasetTable — types and roles', () => {
  it('infers number and text columns', () => {
    const out = parseDatasetTable('Plant,Height\nA,10\nB,12', 'xy')
    expect(out.columns.map((c) => c.type)).toEqual(['text', 'number'])
  })

  it('gives an XY table one x column and makes the rest y', () => {
    const out = parseDatasetTable('Time,Mass,Length\n1,10,5\n2,20,6', 'xy')
    expect(out.columns.map((c) => c.role)).toEqual(['x', 'y', 'y'])
  })

  it('gives a Column table no x at all — its columns are the groups', () => {
    const out = parseDatasetTable('Control,Treated\n10,14\n11,15', 'column')
    expect(out.columns.map((c) => c.role)).toEqual(['y', 'y'])
  })

  it('makes text columns labels', () => {
    const out = parseDatasetTable('Plant,Height\nA,10\nB,12', 'xy')
    expect(out.columns[0]!.role).toBe('label')
  })

  it('keeps a mostly-numeric column numeric despite a stray note', () => {
    const out = parseDatasetTable('Reading\n1\n2\n3\n4\nlost\n6', 'column')
    expect(out.columns[0]!.type).toBe('number')
    // The unparseable cell becomes missing rather than costing the import.
    expect(out.rows.map((r) => r[0])).toEqual([1, 2, 3, 4, null, 6])
  })
})

describe('parseDatasetTable — missing data', () => {
  it('keeps a blank cell as missing rather than dropping the row', () => {
    // A blank y must not drop the row — it still carries every other column's
    // observation, so the cell survives as null rather than deleting the record.
    const out = parseDatasetTable('Time,Mass\n1,10\n2,\n3,30', 'xy')
    expect(out.rows).toEqual([
      [1, 10],
      [2, null],
      [3, 30],
    ])
  })

  it('keeps text rows that are not numbers at all', () => {
    const out = parseDatasetTable('Site,Count\nNorth,3\nSouth,4', 'column')
    expect(out.rows).toHaveLength(2)
  })
})

describe('parseDatasetTable — delimiters and quoting', () => {
  it('reads tab-separated spreadsheet paste', () => {
    const out = parseDatasetTable('Time\tMass\n1\t10\n2\t20', 'xy')
    expect(out.columns.map((c) => c.name)).toEqual(['Time', 'Mass'])
    expect(out.rows).toEqual([
      [1, 10],
      [2, 20],
    ])
  })

  it('keeps a comma inside a quoted cell', () => {
    const out = parseDatasetTable('Note,Value\n"first, second",10', 'column', true)
    expect(out.rows[0]![0]).toBe('first, second')
  })
})

describe('parseDatasetTable — caps', () => {
  it('counts dropped rows instead of silently truncating', () => {
    const body = Array.from({ length: 5_010 }, (_, i) => `${i},${i}`).join('\n')
    const out = parseDatasetTable(`Time,Mass\n${body}`, 'xy')
    expect(out.rows).toHaveLength(5_000)
    expect(out.droppedRows).toBe(10)
  })

  it('counts dropped columns', () => {
    const header = Array.from({ length: 45 }, (_, i) => `c${i}`).join(',')
    const row = Array.from({ length: 45 }, () => '1').join(',')
    const out = parseDatasetTable(`${header}\n${row}`, 'xy')
    expect(out.columns).toHaveLength(40)
    expect(out.droppedColumns).toBe(5)
  })

  it('handles empty input without throwing', () => {
    const out = parseDatasetTable('   ', 'xy')
    expect(out.columns).toEqual([])
    expect(out.rows).toEqual([])
  })
})

describe('spreadsheetColumnName', () => {
  it('counts like a spreadsheet', () => {
    expect(spreadsheetColumnName(0)).toBe('A')
    expect(spreadsheetColumnName(25)).toBe('Z')
    expect(spreadsheetColumnName(26)).toBe('AA')
    expect(spreadsheetColumnName(27)).toBe('AB')
  })
})

describe('toDatasetCsv', () => {
  it('round-trips through the importer', () => {
    const original = parseDatasetTable('Time,Mass\n1,10\n2,20', 'xy')
    const back = parseDatasetTable(toDatasetCsv(original), 'xy')
    expect(back.rows).toEqual(original.rows)
    expect(back.columns.map((c) => c.name)).toEqual(['Time', 'Mass'])
  })

  it('writes units into the header', () => {
    const csv = toDatasetCsv({
      columns: [{ id: 'c1', name: 'Mass', unit: 'g', type: 'number', role: 'y' }],
      rows: [[10]],
    })
    expect(csv.split('\r\n')[0]).toBe('Mass (g)')
  })

  it('neutralises a spreadsheet formula in a text cell', () => {
    // A teacher opens this file; `=cmd|…` must not execute on open.
    const csv = toDatasetCsv({
      columns: [{ id: 'c1', name: 'Note', type: 'text', role: 'label' }],
      rows: [['=HYPERLINK("http://evil","click")']],
    })
    expect(csv).toContain("'=HYPERLINK")
  })

  it('writes a missing cell as empty, not as zero', () => {
    const csv = toDatasetCsv({
      columns: [{ id: 'c1', name: 'Mass', type: 'number', role: 'y' }],
      rows: [[null]],
    })
    expect(csv.split('\r\n')[1]).toBe('')
  })
})

describe('regressions found in review', () => {
  it('de-duplicates repeated header names so the import can actually save', () => {
    // Three replicate columns all called "Mass" is the wide layout this feature
    // is built around, but validateDataset refuses duplicate names — so the
    // import rendered on screen and could never be saved.
    const out = parseDatasetTable('Mass,Mass,Mass\n1,2,3\n4,5,6', 'xy')
    expect(out.columns.map((c) => c.name)).toEqual(['Mass', 'Mass 2', 'Mass 3'])
    expect(validateDataset({ columns: out.columns, rows: out.rows }, 'xy')).toEqual([])
  })

  it('de-duplicates case-insensitively, matching the validator', () => {
    const out = parseDatasetTable('Mass,mass\n1,2', 'xy')
    expect(validateDataset({ columns: out.columns, rows: out.rows }, 'xy')).toEqual([])
  })

  it('handles a file with more records than a spread can take', () => {
    // rawWidth used `Math.max(...records.map(...))`; V8 caps a spread at ~125k
    // arguments, so a 130k-row datalogger export threw RangeError and the file
    // picker appeared to do nothing at all.
    const body = Array.from({ length: 130_000 }, (_, i) => `${i},${i * 2}`).join('\n')
    const out = parseDatasetTable(`Time,Mass\n${body}`, 'xy')
    expect(out.rows).toHaveLength(5_000)
    expect(out.droppedRows).toBe(125_000)
  })

  it('respects an explicit hasHeader=false over its own detection', () => {
    const out = parseDatasetTable('Time,Mass\n1,10\n2,20', 'xy', false)
    expect(out.usedHeader).toBe(false)
    expect(out.rows).toHaveLength(3)
  })
})
