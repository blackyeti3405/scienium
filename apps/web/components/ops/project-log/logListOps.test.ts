import { describe, expect, it } from 'vitest'
import { appendOlderEntries, applySavedEntry, removeEntryAndRenumber } from './logListOps'

/**
 * Project-log list transforms. Entry numbers are the notebook identity
 * students cite in reference chips — the renumbering after a delete is the
 * transform that can silently mislabel every later citation.
 */

function entry(id: string, entryNumber: number) {
  return { id, entryNumber, links: [], backlinks: [] }
}

describe('removeEntryAndRenumber', () => {
  it('closes the gap: numbers ABOVE the deleted one shift down, below stay', () => {
    const out = removeEntryAndRenumber(
      [entry('e4', 4), entry('e3', 3), entry('e2', 2), entry('e1', 1)],
      { id: 'e2', entryNumber: 2 },
    )
    expect(out.map((e) => [e.id, e.entryNumber])).toEqual([
      ['e4', 3],
      ['e3', 2],
      ['e1', 1],
    ])
  })

  it('deleting the newest entry renumbers nothing', () => {
    const out = removeEntryAndRenumber([entry('e2', 2), entry('e1', 1)], {
      id: 'e2',
      entryNumber: 2,
    })
    expect(out.map((e) => e.entryNumber)).toEqual([1])
  })
})

describe('appendOlderEntries', () => {
  it('appends the older page below and normalizes missing links to []', () => {
    const out = appendOlderEntries(
      [entry('e3', 3)],
      [{ id: 'e2', entryNumber: 2, links: null, backlinks: undefined }],
    )
    expect(out.map((e) => e.id)).toEqual(['e3', 'e2'])
    expect(out[1]).toMatchObject({ links: [], backlinks: [] })
  })

  it('drops rows already loaded (a create shifted the page boundary)', () => {
    const out = appendOlderEntries(
      [entry('e3', 3), entry('e2', 2)],
      [entry('e2', 2), entry('e1', 1)], // e2 rides both pages after a boundary shift
    )
    expect(out.map((e) => e.id)).toEqual(['e3', 'e2', 'e1'])
  })
})

describe('applySavedEntry', () => {
  it('create prepends with total+1 when the server omits the number', () => {
    const out = applySavedEntry([entry('e1', 1)], { id: 'e2' }, 'create', 1)
    expect(out[0]).toMatchObject({ id: 'e2', entryNumber: 2, links: [], backlinks: [] })
  })

  it('create prefers the server-assigned number when present', () => {
    const out = applySavedEntry([entry('e1', 1)], { id: 'e2', entryNumber: 7 }, 'create', 1)
    expect(out[0].entryNumber).toBe(7)
  })

  it('edit replaces in place but PRESERVES the number and existing links', () => {
    const linked = { ...entry('e1', 1), links: [{ id: 'ref' }] }
    const out = applySavedEntry([entry('e2', 2), linked], { id: 'e1' }, 'edit', 2)
    expect(out[1]).toMatchObject({ id: 'e1', entryNumber: 1, links: [{ id: 'ref' }] })
    expect(out[0].id).toBe('e2') // untouched
  })
})
