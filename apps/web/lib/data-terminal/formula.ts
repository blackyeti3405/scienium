/**
 * Column formulas — Origin's "Set Values" and the reason Sheets mode needs no
 * Python. One expression per column, evaluated over every row at once:
 *
 *   =col(Mass) / col(Volume)
 *   =log10(col(Concentration))
 *   =col(Reading) / mean(col(Baseline))     // scalar broadcast over rows
 *
 * Deliberately NOT per-cell Excel formulas. A cell-level engine needs a
 * reference graph, cycle detection and incremental recalculation; a column-level
 * one covers unit conversion, normalizing, log transforms, differences and
 * replicate means, which is all a science-fair dataset has ever needed here.
 *
 * Evaluated by a hand-written recursive-descent parser, NOT `new Function` or
 * `eval`. These formulas are team-shared, so a saved formula runs in a
 * teammate's browser — handing that string to the JS engine would be arbitrary
 * code execution against another student's session, and it would need a CSP
 * hole to run at all. The parser only ever produces numbers.
 */

import { numericCell, type CellValue, type ColumnSpec, type DataRow } from './dataset'

/** A value is a scalar or one entry per row; `null` is a missing observation. */
type Vector = (number | null)[]
type Value = number | Vector

export class FormulaError extends Error {}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'ident'; value: string }
  | { kind: 'col'; value: string }
  | { kind: 'op'; value: string }

const OPERATORS = new Set(['+', '-', '*', '/', '^', '(', ')'])

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]!

    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (OPERATORS.has(ch)) {
      tokens.push({ kind: 'op', value: ch })
      i++
      continue
    }

    // Every function here takes exactly one value, so a comma is always a
    // misremembered Excel signature. Say that, rather than "unexpected ,".
    if (ch === ',') {
      throw new FormulaError(
        'Formula functions take a single value — try mean(col(Mass)) rather than a list.',
      )
    }

    if (/[0-9.]/.test(ch)) {
      const start = i
      while (i < input.length && /[0-9.]/.test(input[i]!)) i++
      // Scientific notation: 1e-3, 2.5E6. The sign belongs to the exponent, not
      // to a following subtraction, so it is consumed here.
      if (input[i] === 'e' || input[i] === 'E') {
        const save = i
        i++
        if (input[i] === '+' || input[i] === '-') i++
        if (/[0-9]/.test(input[i] ?? '')) {
          while (i < input.length && /[0-9]/.test(input[i]!)) i++
        } else {
          i = save
        }
      }
      const text = input.slice(start, i)
      const value = Number(text)
      if (!Number.isFinite(value)) throw new FormulaError(`"${text}" is not a number.`)
      tokens.push({ kind: 'number', value })
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      const start = i
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i]!)) i++
      const name = input.slice(start, i)

      // `col(...)` takes a raw column NAME, which may contain spaces, digits and
      // punctuation ("Dry mass", "OD 600"). Read to the matching paren rather
      // than tokenizing the inside, or every space would end the name.
      //
      // Bracket DEPTH, not the first ')': units in parentheses are the normal
      // way a header carries them — "Mass (g)" — and `toDatasetCsv` writes that
      // form itself, so a first-close scan made this app's own export
      // unreferenceable in a formula, permanently, with no escape syntax.
      if (name.toLowerCase() === 'col' && input[i] === '(') {
        let depth = 0
        let close = -1
        for (let j = i; j < input.length; j++) {
          if (input[j] === '(') depth++
          else if (input[j] === ')') {
            depth--
            if (depth === 0) {
              close = j
              break
            }
          }
        }
        if (close === -1) throw new FormulaError('col( is missing its closing bracket.')
        tokens.push({ kind: 'col', value: input.slice(i + 1, close).trim() })
        i = close + 1
        continue
      }

      tokens.push({ kind: 'ident', value: name.toLowerCase() })
      continue
    }

    throw new FormulaError(`"${ch}" is not something a formula can use.`)
  }

  return tokens
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Elementwise over a vector, missing values passing straight through.
 *
 * A result that is not finite becomes missing rather than propagating:
 * `sqrt(-1)` is NaN and `log10(0)` is −Infinity, and either one loose in a
 * column poisons every mean computed from it and collapses a chart's axis.
 * A student who logs a zero reading gets a blank cell they can see, not a
 * silently ruined analysis.
 */
const elementwise =
  (fn: (n: number) => number) =>
  (value: Value): Value => {
    const guard = (n: number): number | null => {
      const out = fn(n)
      return Number.isFinite(out) ? out : null
    }
    if (typeof value === 'number') {
      const out = guard(value)
      if (out === null) throw new FormulaError('That calculation has no answer for this value.')
      return out
    }
    return value.map((v) => (v === null ? null : guard(v)))
  }

/** Collapses a vector to one number; missing values are skipped, not zeroed. */
const aggregate =
  (fn: (values: number[]) => number) =>
  (value: Value): Value => {
    const present = typeof value === 'number' ? [value] : value.filter((v): v is number => v !== null)
    if (present.length === 0) throw new FormulaError('That column has no numbers to summarise.')
    return fn(present)
  }

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Sample standard deviation (n−1) — the estimate from a sample, as in Excel's STDEV. */
function sd(values: number[]): number {
  if (values.length < 2) throw new FormulaError('Standard deviation needs at least two values.')
  const m = mean(values)
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * Null-prototype on purpose. A plain object literal is looked up THROUGH
 * `Object.prototype`, and `constructor`, `__proto__`, `__defineGetter__` and
 * friends are all already lowercase — which is what the tokenizer lowercases
 * identifiers to. `=constructor(5)` therefore resolved to the global `Object`
 * and was invoked, silently blanking the column while the panel reported
 * success. With no prototype there is nothing to walk into.
 */
const UNARY_FUNCTIONS: Record<string, (value: Value) => Value> = Object.assign(
  Object.create(null) as Record<string, (value: Value) => Value>,
  {
  abs: elementwise(Math.abs),
  sqrt: elementwise(Math.sqrt),
  exp: elementwise(Math.exp),
  ln: elementwise(Math.log),
  log10: elementwise(Math.log10),
  log2: elementwise(Math.log2),
  sin: elementwise(Math.sin),
  cos: elementwise(Math.cos),
  tan: elementwise(Math.tan),
  round: elementwise(Math.round),
  floor: elementwise(Math.floor),
  ceil: elementwise(Math.ceil),
  mean: aggregate(mean),
  avg: aggregate(mean),
  sum: aggregate((v) => v.reduce((a, b) => a + b, 0)),
  min: aggregate((v) => Math.min(...v)),
  max: aggregate((v) => Math.max(...v)),
  sd: aggregate(sd),
  stdev: aggregate(sd),
  median: aggregate(median),
  n: aggregate((v) => v.length),
  },
)

export const FORMULA_FUNCTIONS = Object.keys(UNARY_FUNCTIONS).sort()

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Recursive descent over the token list. Precedence, lowest to highest:
 * `+ -` → `* /` → unary `-` → `^` (right-associative) → primary.
 */
class Parser {
  private pos = 0

  constructor(
    private readonly tokens: Token[],
    private readonly column: (name: string) => Vector,
  ) {}

  parse(): Value {
    const value = this.expression()
    if (this.pos < this.tokens.length) {
      throw new FormulaError('There is something extra at the end of this formula.')
    }
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private eatOp(value: string): boolean {
    const token = this.peek()
    if (token?.kind === 'op' && token.value === value) {
      this.pos++
      return true
    }
    return false
  }

  private expression(): Value {
    let left = this.term()
    for (;;) {
      if (this.eatOp('+')) left = combine(left, this.term(), (a, b) => a + b)
      else if (this.eatOp('-')) left = combine(left, this.term(), (a, b) => a - b)
      else return left
    }
  }

  private term(): Value {
    let left = this.unary()
    for (;;) {
      if (this.eatOp('*')) left = combine(left, this.unary(), (a, b) => a * b)
      // Division by zero yields null (a missing result), not Infinity — an
      // Infinity would poison every downstream mean and chart axis.
      else if (this.eatOp('/')) left = combine(left, this.unary(), (a, b) => (b === 0 ? null : a / b))
      else return left
    }
  }

  private unary(): Value {
    if (this.eatOp('-')) return combine(0, this.unary(), (a, b) => a - b)
    if (this.eatOp('+')) return this.unary()
    return this.power()
  }

  private power(): Value {
    const base = this.primary()
    // Right-associative, and the exponent may itself be signed: 2^-1.
    if (this.eatOp('^')) return combine(base, this.unary(), (a, b) => a ** b)
    return base
  }

  private primary(): Value {
    const token = this.peek()
    if (!token) throw new FormulaError('This formula stops early — something is missing.')

    if (token.kind === 'number') {
      this.pos++
      return token.value
    }

    if (token.kind === 'col') {
      this.pos++
      return this.column(token.value)
    }

    if (token.kind === 'ident') {
      this.pos++
      const fn = UNARY_FUNCTIONS[token.value]
      if (!fn) throw new FormulaError(`There is no function called "${token.value}".`)
      if (!this.eatOp('(')) throw new FormulaError(`${token.value} needs brackets: ${token.value}(…).`)
      const arg = this.expression()
      if (!this.eatOp(')')) throw new FormulaError(`${token.value}( is missing its closing bracket.`)
      return fn(arg)
    }

    if (token.value === '(') {
      this.pos++
      const inner = this.expression()
      if (!this.eatOp(')')) throw new FormulaError('A bracket was opened but never closed.')
      return inner
    }

    throw new FormulaError(`"${token.value}" is not something a formula can start with.`)
  }
}

/**
 * Apply a binary operator with scalar broadcasting. If EITHER side is missing
 * at a row, the result is missing there — arithmetic on an unmeasured value has
 * no answer, and substituting zero would invent data.
 */
function combine(left: Value, right: Value, op: (a: number, b: number) => number | null): Value {
  const bothScalar = typeof left === 'number' && typeof right === 'number'
  if (bothScalar) {
    const out = op(left, right)
    if (out === null || !Number.isFinite(out)) {
      throw new FormulaError('That calculation has no answer (check for a division by zero).')
    }
    return out
  }

  const length = Math.max(
    typeof left === 'number' ? 0 : left.length,
    typeof right === 'number' ? 0 : right.length,
  )
  const at = (value: Value, i: number): number | null =>
    typeof value === 'number' ? value : (value[i] ?? null)

  const out: Vector = new Array(length)
  for (let i = 0; i < length; i++) {
    const a = at(left, i)
    const b = at(right, i)
    if (a === null || b === null) {
      out[i] = null
      continue
    }
    const result = op(a, b)
    out[i] = result !== null && Number.isFinite(result) ? result : null
  }
  return out
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FormulaContext {
  columns: ColumnSpec[]
  rows: DataRow[]
  /** The column being computed — referencing it would be a cycle. */
  targetId?: string
}

/**
 * Evaluate a column formula against a dataset, returning one cell per row.
 *
 * Throws `FormulaError` with a message written for a student, never a parser
 * dump. The caller shows it next to the formula box.
 */
export function evaluateFormula(source: string, ctx: FormulaContext): CellValue[] {
  const expression = source.trim().replace(/^=/, '').trim()
  if (!expression) throw new FormulaError('Enter a formula, for example =col(Mass) / col(Volume)')

  const lookup = (name: string): Vector => {
    const key = name.trim().toLowerCase()
    if (!key) throw new FormulaError('col() needs a column name: col(Mass)')
    const column = ctx.columns.find((c) => c.name.trim().toLowerCase() === key)
    if (!column) throw new FormulaError(`There is no column called "${name}".`)
    // A formula that reads its own column would recompute from its own output
    // every time it ran — the result would depend on how often you pressed the
    // button. Refused rather than resolved.
    if (ctx.targetId && column.id === ctx.targetId) {
      throw new FormulaError('A column’s formula cannot use that same column.')
    }
    const index = ctx.columns.indexOf(column)
    return ctx.rows.map((row) => numericCell(row[index] ?? null))
  }

  const value = new Parser(tokenize(expression), lookup).parse()

  if (typeof value === 'number') {
    // A formula with no column reference (`=2*3`) fills every row with the
    // constant, which is what a student pasting a conversion factor expects.
    return ctx.rows.map(() => value)
  }
  return ctx.rows.map((_, i) => value[i] ?? null)
}

/**
 * Re-evaluate every column that carries a formula. This is the recalculation
 * chain: Origin's Auto mode and Prism's live linkage, and the difference
 * between a computed column and a button that once wrote some numbers.
 *
 * Without it, editing a Mass cell left the Density column showing the value it
 * had before — and autosaved that stale number to the database, under a header
 * still badged `fx`.
 *
 * Columns are recomputed left to right in one pass, so a formula may read a
 * computed column declared to its LEFT and see this round's value. One that
 * reads a computed column to its right sees the previous round's — which
 * converges after a second edit rather than being wrong forever.
 * ponytail: single left-to-right pass, not a dependency graph. Topologically
 * order the columns if formulas that reference rightward ever become common.
 *
 * A formula that no longer evaluates (its column was renamed or deleted) leaves
 * its column untouched and is reported, never silently blanked — the numbers
 * already there are the student's last good result.
 */
export function recomputeFormulaColumns(
  columns: ColumnSpec[],
  rows: DataRow[],
): { rows: DataRow[]; failed: { columnId: string; message: string }[] } {
  const failed: { columnId: string; message: string }[] = []
  let next = rows

  columns.forEach((column, index) => {
    if (!column.formula) return
    try {
      const values = evaluateFormula(column.formula, {
        columns,
        rows: next,
        targetId: column.id,
      })
      next = next.map((row, r) => {
        const copy = [...row]
        while (copy.length < columns.length) copy.push(null)
        copy[index] = values[r] ?? null
        return copy
      })
    } catch (err) {
      failed.push({
        columnId: column.id,
        message: err instanceof FormulaError ? err.message : 'This formula could not be worked out.',
      })
    }
  })

  return { rows: next, failed }
}
