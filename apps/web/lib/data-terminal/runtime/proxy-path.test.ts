import { describe, it, expect } from 'vitest'
import { safeRelPath, contentTypeFor } from './proxy-path'

describe('safeRelPath — the runtime proxy trust boundary', () => {
  it('allows real dist files', () => {
    expect(safeRelPath(['pyodide.asm.wasm'])).toBe('pyodide.asm.wasm')
    expect(safeRelPath(['numpy-2.0-cp313-cp313-pyodide_2024_0_wasm32.whl'])).toMatch(/\.whl$/)
    expect(safeRelPath(['pyodide-lock.json'])).toBe('pyodide-lock.json')
  })

  it('rejects every traversal / injection shape', () => {
    expect(safeRelPath([])).toBeNull()
    expect(safeRelPath(['..', 'etc', 'passwd.json'])).toBeNull()
    expect(safeRelPath(['..'])).toBeNull()
    expect(safeRelPath(['.'])).toBeNull()
    expect(safeRelPath(['a/b.wasm'])).toBeNull() // embedded slash
    expect(safeRelPath(['a\\b.wasm'])).toBeNull() // embedded backslash
    expect(safeRelPath(['pyodide.asm.wasm\0.json'])).toBeNull() // NUL
    expect(safeRelPath(['', 'x.wasm'])).toBeNull() // empty segment
  })

  it('rejects extensions outside the allow-list', () => {
    expect(safeRelPath(['secret.env'])).toBeNull()
    expect(safeRelPath(['id_rsa'])).toBeNull()
    expect(safeRelPath(['config.yaml'])).toBeNull()
  })

  it('maps content types, defaulting to octet-stream', () => {
    expect(contentTypeFor('pyodide.asm.wasm')).toBe('application/wasm')
    expect(contentTypeFor('x.whl')).toBe('application/octet-stream')
    expect(contentTypeFor('weird.bin')).toBe('application/octet-stream')
  })
})
