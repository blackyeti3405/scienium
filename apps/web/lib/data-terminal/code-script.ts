/**
 * Pure helpers for the Code-lane UI (Phase C2). No React, no DOM — so the
 * starter-script generator, the script id, and the `.py` filename are unit-
 * tested directly.
 */

import { slugify } from './export'
import type { CodeScriptSpec } from './dataset-schema'

/** The runtime's per-column shape (name + type), matching `RuntimeDataset`. */
export interface RuntimeColumn {
  name: string
  type: 'number' | 'text' | 'date'
}

// The globals the worker injects a DataFrame + numpy handles under; a column
// with any of these names is reachable only through `df[...]`.
const RESERVED = new Set(['df', 'np', 'pd', 'plt'])

// Python 3 hard keywords. Mirrors `keyword.iskeyword` in pyodide.worker.ts's
// `_namespace`, which is what decides whether a column is exposed as a bare
// variable. Kept in sync so the starter never references a global that the
// worker won't actually create. (Soft keywords — match/case/_ — are not
// reserved, so they are deliberately absent.)
const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for',
  'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
])

/**
 * Is this column name exposed as a bare Python variable? Same rule as the
 * worker: a valid identifier, not a keyword, not one of the injected globals.
 */
export function isBareName(name: string): boolean {
  return (
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) &&
    !PYTHON_KEYWORDS.has(name) &&
    !RESERVED.has(name)
  )
}

/**
 * A safely-quoted Python string literal for an arbitrary column name. Escapes
 * `\` and `'` so the literal's delimiters can't be broken out of, and
 * `\n`/`\r`/`\t` so a column name containing a real newline (reachable via a
 * quoted-CSV import header) can't leak a raw line break into the middle of
 * the literal — which would split it and throw a SyntaxError in the
 * generated script.
 */
export function pyQuote(s: string): string {
  return `'${s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}'`
}

/** Flattens a column name for a `#` comment line — a raw newline there would
 * split the comment across a physical line, and the continuation (no longer
 * prefixed with `#`) would be a SyntaxError. */
function commentSafe(s: string): string {
  return s.replace(/[\r\n]+/g, ' ')
}

/**
 * Python expression that reaches a column's array: the bare variable when the
 * name allows it, otherwise `df['Column Name']` — always valid.
 */
export function pyColRef(name: string): string {
  return isBareName(name) ? name : `df[${pyQuote(name)}]`
}

/**
 * A helpful, RUNNABLE starter script for a new Code-lane script: documents the
 * injected globals, spells out which columns are bare variables vs `df[...]`,
 * and plots the first two numeric columns so Run draws a figure immediately.
 * The plot always uses `df[...]` refs, so it is valid whatever the names are.
 */
export function starterScript(columns: RuntimeColumn[]): string {
  const lines: string[] = [
    '# Data Terminal — Code mode (Python, in your browser)',
    '#',
    '# Your dataset is preloaded. Available globals:',
    '#   df            pandas DataFrame of the whole table',
    '#   np, pd, plt   numpy, pandas, matplotlib.pyplot',
    '#   <column>      a numpy array for each column with a plain-word name',
    '#',
    "# A name with spaces or symbols isn't a valid Python variable — reach it",
    "# through the DataFrame instead, e.g. df['My Column'].",
  ]

  if (columns.length > 0) {
    lines.push('#', '# Columns in this dataset:')
    for (const c of columns) lines.push(`#   ${commentSafe(c.name)}  ->  ${pyColRef(c.name)}`)
  }

  lines.push(
    '#',
    '# print() shows in the output panel; draw with matplotlib and the figure',
    '# appears below the code.',
    '',
    'import matplotlib.pyplot as plt',
    '',
    'fig, ax = plt.subplots()',
  )

  const numeric = columns.filter((c) => c.type === 'number')
  if (numeric.length >= 2) {
    lines.push(
      `ax.plot(df[${pyQuote(numeric[0]!.name)}], df[${pyQuote(numeric[1]!.name)}], marker='o')`,
      `ax.set_xlabel(${pyQuote(numeric[0]!.name)})`,
      `ax.set_ylabel(${pyQuote(numeric[1]!.name)})`,
    )
  } else if (numeric.length === 1) {
    lines.push(
      `ax.plot(df[${pyQuote(numeric[0]!.name)}], marker='o')`,
      `ax.set_ylabel(${pyQuote(numeric[0]!.name)})`,
    )
  } else {
    lines.push("ax.plot([1, 2, 3], [1, 4, 9], marker='o')  # add numeric columns to plot your data")
  }
  lines.push("ax.set_title('My figure')")

  return lines.join('\n')
}

/** Deterministic script id (`s1`, `s2`, …), unique within the array. */
export function newScriptId(existing: CodeScriptSpec[]): string {
  let n = existing.length + 1
  const taken = new Set(existing.map((s) => s.id))
  while (taken.has(`s${n}`)) n++
  return `s${n}`
}

/** `.py` download filename for a script name (slugified, same as CSV/PNG). */
export function pyFilename(name: string): string {
  return `${slugify(name)}.py`
}
