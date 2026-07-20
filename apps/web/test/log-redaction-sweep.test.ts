import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Static sweep: no server-side `console.*` call may carry student content or
 * model output (A7).
 *
 * `lib/observability/log.ts` is redaction-by-design, but a raw `console.*`
 * bypasses it. The v0.29.4 audit found ten sites logging the student's search
 * query or 200–500-char model-output slices (which can echo paper text or
 * student work). This sweep keeps that class closed: inside any `console.*`
 * argument list in `app/api/**` or `lib/**`, it forbids
 *
 *   - `.slice(` — the excerpt-a-payload-into-the-log signature, and
 *   - known payload identifiers (`raw`, `verdictRaw`, `fullText`, …).
 *
 * Log identifiers, error classes, lengths, and stop reasons instead — via
 * `logEvent` (preferred) or a payload-free `console.error`. If a genuinely
 * safe use of these tokens ever appears, allowlist THAT site here with a
 * comment, not the pattern.
 */

const WEB_ROOT = join(__dirname, '..')
const SCAN_ROOTS = [join(WEB_ROOT, 'app', 'api'), join(WEB_ROOT, 'lib')]

const PAYLOAD_TOKENS =
  /\.slice\s*\(|\b(raw|genRaw|verdictRaw|verdictText|fullText|planText|questionsJson|submission|answerText|prompt|promptText)\b/

/** file (repo-relative) → allowlisted match, with the justification beside it. */
const ALLOWLIST: Record<string, RegExp> = {}

const collect = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath, e.name))

/** Extract the argument span of each console.* call (balanced parentheses). */
function consoleCallSpans(src: string): Array<{ line: number; span: string }> {
  const spans: Array<{ line: number; span: string }> = []
  const re = /console\.(log|info|warn|error|debug)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    let depth = 1
    let i = re.lastIndex
    while (i < src.length && depth > 0) {
      const ch = src[i]
      if (ch === '(') depth++
      else if (ch === ')') depth--
      i++
    }
    spans.push({
      line: src.slice(0, m.index).split('\n').length,
      span: src.slice(re.lastIndex, i - 1),
    })
  }
  return spans
}

describe('log redaction sweep (A7)', () => {
  const files = SCAN_ROOTS.flatMap(collect)

  it('scans a non-trivial server surface (sweep is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(150)
  })

  it('no console.* argument carries a payload token or excerpt', () => {
    const violations: string[] = []
    for (const file of files) {
      const rel = relative(WEB_ROOT, file)
      const src = readFileSync(file, 'utf8')
      for (const { line, span } of consoleCallSpans(src)) {
        // `<payload>.length` is the sanctioned redacted form — drop it before
        // matching so only the payload itself (or a slice of it) is flagged.
        const scrubbed = span.replace(
          /\b(raw|genRaw|verdictRaw|verdictText|fullText|planText|questionsJson|submission|answerText|prompt|promptText)\.length\b/g,
          '',
        )
        if (!PAYLOAD_TOKENS.test(scrubbed)) continue
        if (ALLOWLIST[rel]?.test(span)) continue
        violations.push(`${rel}:${line} → console.*(${span.trim().slice(0, 120)})`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
