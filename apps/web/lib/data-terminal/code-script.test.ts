import { describe, expect, it } from 'vitest'
import { isBareName, pyColRef, starterScript, newScriptId, pyFilename } from './code-script'
import type { CodeScriptSpec } from './dataset-schema'

describe('isBareName / pyColRef (mirror the worker exposure rule)', () => {
  it('exposes plain identifiers as bare variables', () => {
    expect(isBareName('Time')).toBe(true)
    expect(pyColRef('Time')).toBe('Time')
  })
  it('routes spaces, symbols, keywords, and reserved globals through df[...]', () => {
    for (const n of ['My Column', 'C2H5OH%', 'class', 'df', 'pd']) {
      expect(isBareName(n)).toBe(false)
    }
    expect(pyColRef('My Column')).toBe("df['My Column']")
  })
  it('escapes quotes in df[...] refs so the expression stays valid Python', () => {
    expect(pyColRef("O'Brien")).toBe("df['O\\'Brien']")
  })
  it('escapes an embedded newline instead of leaking a raw line break into the literal', () => {
    // Reachable via a quoted-CSV import header. An un-escaped '\n' here used to
    // land as a literal line break inside the '...' string, splitting it and
    // throwing a SyntaxError in the generated script.
    expect(pyColRef('Bad\nName')).toBe("df['Bad\\nName']")
  })
})

describe('starterScript', () => {
  it('plots the first two numeric columns via df[...] and documents refs', () => {
    const code = starterScript([
      { name: 'Time', type: 'number' },
      { name: 'Mass g', type: 'number' },
      { name: 'Note', type: 'text' },
    ])
    expect(code).toContain('import matplotlib.pyplot as plt')
    expect(code).toContain("ax.plot(df['Time'], df['Mass g'], marker='o')")
    // The comment tells the student how to reach a spaced name.
    expect(code).toContain("df['Mass g']")
    // A plain-word column is documented as a bare variable.
    expect(code).toContain('#   Time  ->  Time')
  })
  it('is still runnable with no numeric columns (demo data)', () => {
    const code = starterScript([{ name: 'Label', type: 'text' }])
    expect(code).toContain('ax.plot([1, 2, 3], [1, 4, 9]')
  })
  it('keeps a column comment on one line when the name has an embedded newline', () => {
    // Was reachable via a quoted-CSV import header: the raw '\n' used to split
    // this "#   <name>  ->  <ref>" comment across a physical line, and the
    // continuation — no longer prefixed with '#' — was a SyntaxError.
    const code = starterScript([{ name: 'Bad\nName', type: 'text' }])
    const lines = code.split('\n')
    expect(lines).toContain("#   Bad Name  ->  df['Bad\\nName']")
    // Every line is either a comment or blank/code — none is a bare
    // continuation fragment of the name with no '#' prefix.
    expect(lines.some((l) => l === 'Name' || l.trim() === 'Name')).toBe(false)
  })
})

describe('newScriptId', () => {
  it('avoids collisions with existing ids', () => {
    const scripts: CodeScriptSpec[] = [
      { id: 's1', name: 'a', code: '' },
      { id: 's2', name: 'b', code: '' },
    ]
    const id = newScriptId(scripts)
    expect(id).not.toBe('s1')
    expect(id).not.toBe('s2')
    expect(scripts.some((s) => s.id === id)).toBe(false)
  })
})

describe('pyFilename', () => {
  it('slugifies the name and adds .py', () => {
    expect(pyFilename('My First Script!')).toBe('my-first-script.py')
    expect(pyFilename('   ')).toBe('experiment.py') // empty → the shared default
  })
})
