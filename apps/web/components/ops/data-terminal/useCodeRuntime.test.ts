import { describe, expect, it } from 'vitest'
import { MAX_FIGURES, MAX_STREAM_BYTES, type ResultMessage } from '@/lib/data-terminal/runtime/protocol'
import { enforceCaps } from './useCodeRuntime'

function msg(over: Partial<ResultMessage>): ResultMessage {
  return { type: 'result', figures: [], stdout: '', stderr: '', ...over }
}

describe('enforceCaps (authoritative, JS-side)', () => {
  it('caps the figure COUNT to MAX_FIGURES and notes the drop', () => {
    const figures = Array.from({ length: MAX_FIGURES + 5 }, (_, i) => `<svg>${i}</svg>`)
    const out = enforceCaps(msg({ figures }))
    expect(out.figures).toHaveLength(MAX_FIGURES)
    expect(out.stderr).toMatch(/figure\(s\) dropped/)
  })

  it('truncates stdout and stderr to MAX_STREAM_BYTES with a notice', () => {
    const huge = 'x'.repeat(MAX_STREAM_BYTES * 2)
    const out = enforceCaps(msg({ stdout: huge, stderr: huge }))
    expect(new TextEncoder().encode(out.stdout).length).toBeLessThanOrEqual(MAX_STREAM_BYTES + 64)
    expect(out.stdout).toMatch(/output truncated/)
    expect(out.stderr).toMatch(/output truncated/)
  })

  it('passes small results through unchanged', () => {
    const out = enforceCaps(msg({ figures: ['<svg/>'], stdout: 'hi', stderr: '' }))
    expect(out.figures).toEqual(['<svg/>'])
    expect(out.stdout).toBe('hi')
    expect(out.stderr).toBe('')
  })

  it('preserves an error field', () => {
    expect(enforceCaps(msg({ error: 'boom' })).error).toBe('boom')
  })
})
