import { describe, expect, it } from 'vitest'
import { describeGridChange } from './synthesisDiff'
import type { SynthesisMatrixResponse } from './synthesisApi'

/**
 * The stale-grid 409 is the only place a student learns their teammate moved
 * the grid under them. If this diff says "nothing changed" when something did,
 * the message is worse than the generic one it replaced — so the empty case and
 * each change class are pinned separately.
 */

function grid(over: Partial<SynthesisMatrixResponse> = {}): SynthesisMatrixResponse {
  return {
    id: 'm1',
    title: 'Matrix',
    templateId: 'default',
    columns: [
      { id: 'findings', label: 'Findings' },
      { id: 'methods', label: 'Methods' },
    ],
    papers: [
      { id: 'p1', title: 'Voltage decay in salt bridges', authors: ['Hertz, V'] },
      { id: 'p2', title: 'Electrode surface area and current', authors: ['Ohm, G'] },
    ],
    cells: [
      { paperId: 'p1', columnId: 'findings', text: 'decays fast' },
      { paperId: 'p2', columnId: 'methods', text: 'four electrodes' },
    ],
    inputHash: 'h1',
    lastCheck: null,
    lastCheckedAt: null,
    kpAwarded: 0,
    updatedAt: '2026-07-27T00:00:00.000Z',
    ...over,
  }
}

describe('describeGridChange', () => {
  it('returns null when the two snapshots match', () => {
    expect(describeGridChange(grid(), grid())).toBeNull()
  })

  it('returns null when either snapshot is missing', () => {
    expect(describeGridChange(null, grid())).toBeNull()
    expect(describeGridChange(grid(), null)).toBeNull()
  })

  it('names an added column', () => {
    const after = grid({
      columns: [...grid().columns, { id: 'sample-size', label: 'Sample size' }],
    })
    expect(describeGridChange(grid(), after)).toBe('Changed: the “Sample size” column was added.')
  })

  it('names a removed column', () => {
    const after = grid({ columns: [{ id: 'findings', label: 'Findings' }], cells: [grid().cells[0]!] })
    expect(describeGridChange(grid(), after)).toBe('Changed: the “Methods” column was removed.')
  })

  it('names a rename by both labels', () => {
    const after = grid({
      columns: [
        { id: 'findings', label: 'Key findings' },
        { id: 'methods', label: 'Methods' },
      ],
    })
    expect(describeGridChange(grid(), after)).toBe('Changed: “Findings” was renamed to “Key findings”.')
  })

  it('names the single edited cell by column and paper', () => {
    const after = grid({
      cells: [
        { paperId: 'p1', columnId: 'findings', text: 'decays fast, then plateaus' },
        { paperId: 'p2', columnId: 'methods', text: 'four electrodes' },
      ],
    })
    expect(describeGridChange(grid(), after)).toBe(
      'Changed: the “Findings” cell for “Voltage decay in salt bridges” was edited.',
    )
  })

  it('counts a cell the server dropped entirely (cleared to empty)', () => {
    const after = grid({ cells: [{ paperId: 'p2', columnId: 'methods', text: 'four electrodes' }] })
    expect(describeGridChange(grid(), after)).toBe(
      'Changed: the “Findings” cell for “Voltage decay in salt bridges” was edited.',
    )
  })

  it('counts rather than lists once more than one cell moved', () => {
    const after = grid({
      cells: [
        { paperId: 'p1', columnId: 'findings', text: 'a' },
        { paperId: 'p2', columnId: 'methods', text: 'b' },
      ],
    })
    expect(describeGridChange(grid(), after)).toBe('Changed: 2 cells were edited.')
  })

  it('truncates a long paper title instead of burying the sentence', () => {
    const long = 'A'.repeat(80)
    const after = grid({ papers: [...grid().papers, { id: 'p3', title: long, authors: [] }] })
    const msg = describeGridChange(grid(), after)!
    expect(msg).toContain('…')
    expect(msg).not.toContain(long)
    expect(msg.length).toBeLessThan(100)
  })

  it('caps the list at two named changes and counts the rest', () => {
    const after = grid({
      columns: [
        { id: 'findings', label: 'Findings' },
        { id: 'methods', label: 'Methods' },
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
    })
    expect(describeGridChange(grid(), after)).toBe(
      'Changed: the “A” column was added, the “B” column was added, and 1 other change.',
    )
  })

  it('a cell that vanished WITH its column is reported as the column, not double-counted', () => {
    const after = grid({
      columns: [{ id: 'findings', label: 'Findings' }],
      cells: [{ paperId: 'p1', columnId: 'findings', text: 'decays fast' }],
    })
    expect(describeGridChange(grid(), after)).toBe('Changed: the “Methods” column was removed.')
  })
})
