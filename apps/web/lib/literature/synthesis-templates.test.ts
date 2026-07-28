import { describe, it, expect } from 'vitest'
import {
  SYNTHESIS_TEMPLATES,
  templateForLabType,
  findTemplate,
} from '@/content/literature/synthesis-templates'
import { LAB_TYPES } from '@/lib/phase'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the 7-template synthesis-matrix
// seed set stays well-formed as it's edited. Mirrors methods-guide.test.ts.
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('SYNTHESIS_TEMPLATES content shape', () => {
  it('ships at least 7 templates', () => {
    // A floor, not a pin — an exact count fails on every legitimate template
    // addition and catches nothing the id-uniqueness check below misses.
    expect(SYNTHESIS_TEMPLATES.length).toBeGreaterThanOrEqual(7)
  })

  it('every template id is unique and slug-safe', () => {
    const ids = SYNTHESIS_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(SLUG_RE)
  })

  it('every column id is slug-safe and unique within its own template', () => {
    for (const t of SYNTHESIS_TEMPLATES) {
      const ids = [...t.columns, ...t.optionalColumns].map((c) => c.id)
      for (const id of ids) expect(id).toMatch(SLUG_RE)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('every LabType value is claimed by exactly one template', () => {
    for (const labType of LAB_TYPES) {
      const claimants = SYNTHESIS_TEMPLATES.filter((t) => t.labTypes.includes(labType))
      expect(claimants).toHaveLength(1)
    }
  })

  it('the "general" template claims no LabType', () => {
    const general = SYNTHESIS_TEMPLATES.find((t) => t.id === 'general')
    expect(general).toBeDefined()
    expect(general?.labTypes).toEqual([])
  })

  it('every template has 4-6 seeded columns and at least 3 optional columns, never more than MAX_COLUMNS (8) combined', () => {
    for (const t of SYNTHESIS_TEMPLATES) {
      expect(t.columns.length).toBeGreaterThanOrEqual(4)
      expect(t.columns.length).toBeLessThanOrEqual(6)
      expect(t.optionalColumns.length).toBeGreaterThanOrEqual(3)
      expect(t.columns.length).toBeLessThanOrEqual(8)
    }
  })

  it('every label/hint/description is non-empty', () => {
    for (const t of SYNTHESIS_TEMPLATES) {
      expect(t.label.trim().length).toBeGreaterThan(0)
      expect(t.description.trim().length).toBeGreaterThan(0)
      for (const c of [...t.columns, ...t.optionalColumns]) {
        expect(c.label.trim().length).toBeGreaterThan(0)
        expect(c.hint.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('templateForLabType', () => {
  it('falls back to "general" for null', () => {
    expect(templateForLabType(null).id).toBe('general')
  })

  it('resolves axiom to computational-cs', () => {
    expect(templateForLabType('axiom').id).toBe('computational-cs')
  })

  it('resolves every LabType to a non-general template', () => {
    for (const labType of LAB_TYPES) {
      expect(templateForLabType(labType).id).not.toBe('general')
    }
  })
})

describe('findTemplate', () => {
  it('finds a known template by id', () => {
    expect(findTemplate('general')?.id).toBe('general')
  })

  it('returns undefined for an unknown id', () => {
    expect(findTemplate('not-a-real-template')).toBeUndefined()
  })
})
