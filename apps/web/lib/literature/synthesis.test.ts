import { describe, it, expect } from 'vitest'
import { sanitizeVerdict, matrixInputHash, e2eStubVerdict, VerdictSchema, type MatrixVerdict } from '@/lib/literature/synthesis'

const PAPER_A = 'clh1a2b3c4d5e6f7g8h9i0'
const PAPER_B = 'clh1a2b3c4d5e6f7g8h9i1'
const COL_ORGANISM = 'organism'
const COL_SAMPLE = 'sample-size'

function emptyVerdict(overrides: Partial<MatrixVerdict> = {}): MatrixVerdict {
  return {
    agreements: [],
    contradictions: [],
    gaps: [],
    cellIssues: [],
    suggestedColumns: [],
    summary: 'ok',
    ...overrides,
  }
}

describe('sanitizeVerdict', () => {
  const opts = {
    paperIds: [PAPER_A, PAPER_B],
    columnIds: [COL_ORGANISM, COL_SAMPLE],
    columnLabels: ['Organism / model system', 'Sample size (n)'],
  }

  it('drops a finding referencing an unknown columnId', () => {
    const verdict = emptyVerdict({
      agreements: [
        { columnId: 'not-a-real-column', paperIds: [PAPER_A, PAPER_B], claim: 'x', studentNoticed: false },
      ],
    })
    const sanitized = sanitizeVerdict(verdict, opts)
    expect(sanitized.agreements).toHaveLength(0)
  })

  it('drops a cellIssue for a paper not in the matrix', () => {
    const verdict = emptyVerdict({
      cellIssues: [{ paperId: 'clh-not-in-matrix000000', columnId: COL_ORGANISM, note: 'x' }],
    })
    const sanitized = sanitizeVerdict(verdict, opts)
    expect(sanitized.cellIssues).toHaveLength(0)
  })

  it('drops a cellIssue referencing an unknown columnId even for a valid paper', () => {
    const verdict = emptyVerdict({
      cellIssues: [{ paperId: PAPER_A, columnId: 'ghost-column', note: 'x' }],
    })
    const sanitized = sanitizeVerdict(verdict, opts)
    expect(sanitized.cellIssues).toHaveLength(0)
  })

  it('keeps a valid finding', () => {
    const verdict = emptyVerdict({
      contradictions: [
        { columnId: COL_SAMPLE, paperIds: [PAPER_A, PAPER_B], claim: 'they disagree', studentNoticed: false },
      ],
    })
    const sanitized = sanitizeVerdict(verdict, opts)
    expect(sanitized.contradictions).toHaveLength(1)
    expect(sanitized.contradictions[0].claim).toBe('they disagree')
  })

  it('drops a finding left with fewer than 2 surviving paperIds after filtering', () => {
    const verdict = emptyVerdict({
      agreements: [
        {
          columnId: COL_ORGANISM,
          paperIds: [PAPER_A, 'clh-hallucinated-paper-id'],
          claim: 'x',
          studentNoticed: true,
        },
      ],
    })
    const sanitized = sanitizeVerdict(verdict, opts)
    expect(sanitized.agreements).toHaveLength(0)
  })

  it('dedupes suggestedColumns case-insensitively against existing labels', () => {
    const verdict = emptyVerdict({
      suggestedColumns: [
        { label: 'organism / model system', hint: 'dup of existing' },
        { label: 'Duration', hint: 'new one' },
        { label: 'Duration', hint: 'duplicate of the new one' },
      ],
    })
    const sanitized = sanitizeVerdict(verdict, opts)
    expect(sanitized.suggestedColumns).toHaveLength(1)
    expect(sanitized.suggestedColumns[0].label).toBe('Duration')
  })

  it('a real model verdict parsed through VerdictSchema sanitizes cleanly', () => {
    const raw = {
      agreements: [{ columnId: COL_ORGANISM, paperIds: [PAPER_A, PAPER_B], claim: 'a', studentNoticed: true }],
      contradictions: [],
      gaps: [{ text: 'nothing on long-term effects' }],
      cellIssues: [],
      suggestedColumns: [],
      summary: 'Solid reading overall.',
    }
    const parsed = VerdictSchema.parse(raw)
    const sanitized = sanitizeVerdict(parsed, opts)
    expect(sanitized.agreements).toHaveLength(1)
    expect(sanitized.gaps).toHaveLength(1)
  })
})

describe('matrixInputHash', () => {
  const columns = [{ id: COL_ORGANISM, label: 'Organism / model system' }]
  const paperIds = [PAPER_A, PAPER_B]
  const cells = [{ paperId: PAPER_A, columnId: COL_ORGANISM, text: 'mice' }]

  it('is stable under key reordering', () => {
    const a = matrixInputHash('experimental-bio', columns, paperIds, cells)
    // Same data, columns objects built with keys in a different order.
    const reordered = [{ label: 'Organism / model system', id: COL_ORGANISM }]
    const b = matrixInputHash('experimental-bio', reordered, paperIds, cells)
    expect(a).toBe(b)
  })

  it('is stable under cell array order', () => {
    const twoCells = [
      { paperId: PAPER_A, columnId: COL_ORGANISM, text: 'mice' },
      { paperId: PAPER_B, columnId: COL_ORGANISM, text: 'rats' },
    ]
    const reversed = [...twoCells].reverse()
    const a = matrixInputHash('experimental-bio', columns, paperIds, twoCells)
    const b = matrixInputHash('experimental-bio', columns, paperIds, reversed)
    expect(a).toBe(b)
  })

  it('changes when a cell changes', () => {
    const a = matrixInputHash('experimental-bio', columns, paperIds, cells)
    const changed = [{ paperId: PAPER_A, columnId: COL_ORGANISM, text: 'rats' }]
    const b = matrixInputHash('experimental-bio', columns, paperIds, changed)
    expect(a).not.toBe(b)
  })

  it('changes when the templateId changes', () => {
    const a = matrixInputHash('experimental-bio', columns, paperIds, cells)
    const b = matrixInputHash('general', columns, paperIds, cells)
    expect(a).not.toBe(b)
  })
})

describe('e2eStubVerdict', () => {
  it('produces a verdict that parses cleanly under VerdictSchema', () => {
    const verdict = e2eStubVerdict({ paperIds: [PAPER_A, PAPER_B], columnIds: [COL_ORGANISM, COL_SAMPLE] })
    expect(() => VerdictSchema.parse(verdict)).not.toThrow()
  })

  it('always contains at least one studentNoticed: false contradiction', () => {
    const verdict = e2eStubVerdict({ paperIds: [PAPER_A, PAPER_B], columnIds: [COL_ORGANISM, COL_SAMPLE] })
    expect(verdict.contradictions.some((c) => c.studentNoticed === false)).toBe(true)
  })

  it('survives sanitizeVerdict unmodified when ids match the matrix', () => {
    const paperIds = [PAPER_A, PAPER_B]
    const columnIds = [COL_ORGANISM, COL_SAMPLE]
    const verdict = e2eStubVerdict({ paperIds, columnIds })
    const sanitized = sanitizeVerdict(verdict, {
      paperIds,
      columnIds,
      columnLabels: ['Organism / model system', 'Sample size (n)'],
    })
    expect(sanitized.contradictions).toHaveLength(1)
    expect(sanitized.agreements).toHaveLength(1)
    expect(sanitized.cellIssues).toHaveLength(1)
  })
})
