import { describe, it, expect } from 'vitest'
import { ANALYSES_PY } from '@/lib/data-terminal/runtime/analysis-templates.mjs'
import {
  POSTER_HSPACE,
  POSTER_PANEL_H,
  POSTER_PANEL_W,
  POSTER_WSPACE,
} from '@/lib/data-terminal/dataset-schema'

/**
 * The poster preview shapes its cells from TS constants; the exported figure is
 * laid out by matplotlib from Python constants inside the template string. They
 * describe the SAME board, so if they drift the preview quietly stops matching
 * the download — which is exactly the bug this geometry was introduced to fix,
 * and it would come back silently.
 *
 * These read the numbers out of the template source rather than restating them,
 * so editing the Python without editing the TS fails here.
 */
function pyNumber(name: string): number {
  const m = ANALYSES_PY.match(new RegExp(`^${name}\\s*=\\s*([0-9.]+)`, 'm'))
  if (!m) throw new Error(`${name} not found in the analysis template source`)
  return Number(m[1])
}

describe('poster geometry stays in sync across the JS/Python boundary', () => {
  it('cell size matches _PANEL_W / _PANEL_H', () => {
    expect(pyNumber('_PANEL_W')).toBe(POSTER_PANEL_W)
    expect(pyNumber('_PANEL_H')).toBe(POSTER_PANEL_H)
  })

  it('subplot gaps match wspace / hspace', () => {
    const adjust = ANALYSES_PY.match(/subplots_adjust\([^)]*\)/)?.[0] ?? ''
    expect(adjust).toContain(`wspace=${POSTER_WSPACE}`)
    expect(adjust).toContain(`hspace=${POSTER_HSPACE}`)
  })

  it('the board is still figsize=(cols * _PANEL_W, rows * _PANEL_H)', () => {
    // If the export stops giving every cell an identical box, a single
    // fixed-aspect preview cell is no longer the right model and this test
    // should fail rather than let the two silently diverge.
    expect(ANALYSES_PY).toContain('figsize=(c * _PANEL_W, r * _PANEL_H)')
  })
})
