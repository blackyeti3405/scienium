import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { describe, it, expect } from 'vitest'

/**
 * Static sweep: no server-side log call may carry student content or model
 * output (A7, reopened as REFACTOR2 P2-S11).
 *
 * `lib/observability/log.ts` is redaction-by-design, but a raw `console.*` — or
 * a payload stuffed into `logEvent`'s free-text `detail` — bypasses it.
 *
 * ## Why this is an AST allowlist and not a token list
 *
 * The previous sweep matched a finite list of payload variable NAMES (`raw`,
 * `verdictRaw`, `fullText`, …). That is a list of the payloads someone had
 * already thought of: `console.error(\`… "\${title}" …\`)` in the discovery
 * article route walked straight past it, and so would any rename. A deny-list of
 * names can only ever be as good as its last audit.
 *
 * So the policy is inverted and closed: parse every log call with TypeScript's
 * own compiler API (already a dependency — no new one) and require every
 * argument expression to be **provably payload-free by SHAPE**:
 *
 *   - literals (string / number / boolean / null / plain template), and
 *     template substitutions / object values / array elements that are
 *     themselves provably safe;
 *   - a `.length` / `.status` / `.id` / … terminal — a count, an HTTP status, or
 *     an opaque id, never free text (`SAFE_PROPS`);
 *   - the caught error of an enclosing `try/catch`, resolved STRUCTURALLY from
 *     the AST rather than by being named `err` — so renaming it changes nothing.
 *
 * Anything else — a bare identifier, an element access, a call — is a violation
 * unless its exact source text is enumerated in `ALLOWLIST` with a reason. A NEW
 * log call that interpolates a request- or model-derived value therefore fails
 * this gate no matter what the variable is called, which is precisely what the
 * name list could not do.
 *
 * Adding an entry to `ALLOWLIST` is a deliberate, reviewable act: it records
 * that a human looked at THAT expression and established the value is bounded
 * and operator-facing (an enum, a registry key, a status), not user content.
 */

const WEB_ROOT = join(__dirname, '..')
const SCAN_ROOTS = [join(WEB_ROOT, 'app', 'api'), join(WEB_ROOT, 'lib')]

/**
 * Property terminals that cannot carry free text whatever they hang off:
 * counts, opaque cuids, HTTP statuses, bounded provider enums, route paths.
 *
 * This is an ALLOW list of names that are safe by type, which is the inversion
 * that matters: the old policy listed the payload names someone had already
 * thought of, so a rename escaped it. Here a rename lands outside the set and is
 * denied. `.name`, `.title`, `.text`, `.key` are deliberately absent — a user's
 * name, a paper title, model text, and a grading key are exactly what this
 * sweep exists to keep out of the logs.
 */
const SAFE_PROPS = new Set([
  // counts and sizes
  'length',
  'size',
  'count',
  'byteLength',
  'attempts',
  'input_tokens',
  'output_tokens',
  // opaque identifiers
  'id',
  'teamId',
  'userId',
  'dbUserId',
  'paperId',
  'jobId',
  // bounded statuses / enums
  'status',
  'code',
  'stop_reason',
  // the route path — LogEvent.route's own domain
  'pathname',
  // Built by `parseModelOutput` from a reason enum, a provider stop reason and a
  // character count. It exists precisely so a call site never has to touch the
  // model's text to say why the parse failed (lib/ai/spend.ts).
  'logDetail',
])

/**
 * file (repo-relative, POSIX) → exact argument source texts that are allowed
 * despite not being provably safe by shape. One line of justification each.
 */
const ALLOWLIST: Record<string, string[]> = {
  // The sink itself: `line` is the JSON.stringify of a `LogEvent`, whose TYPE
  // has no payload field. Redaction here is the type, not this sweep.
  'lib/observability/log.ts': ['line'],
  // Module-level constants and local counters — all numbers.
  'app/api/cron/notifications/route.ts': ['MAX_TEAMS_PER_RUN', 'RUN_BUDGET_MS', 'processed'],
  'app/api/cron/papers/route.ts': [
    'now.getTime()',
    'cleanedAssets',
    'reconciled',
    'terminalized',
    // P2-S6's catalog sweep: a `createMany` row count and a failure tally.
    'citationsBackfilled',
    'catalogFailures',
  ],
  'lib/notifications/outbox.ts': ['sent'],
  'lib/economy/lab-credit.ts': ['attempt'],
  'lib/literature/process-paper.ts': ['paperId', 'attempts'],
  // `stage` is one of a handful of hardcoded worker stage names (`release`,
  // `complete`, `step:<target>` from the `STEPS` registry) — never subject data.
  'lib/data-requests/workflow.ts': ['exhausted', 'request.kind', 'stage'],
  // The suppression REASON column: `bounced` | `complained`, written only by the
  // webhook. The address it belongs to is deliberately not logged.
  'lib/notifications/email.ts': ['suppressed.reason'],
  // Same two-value enum, plus the platform request id (see `lib/rate-limit.ts`).
  // The recipient list is logged as `.length` only.
  'app/api/webhooks/resend/route.ts': ['reason', 'requestIdFrom(req)'],
  // Registry / enum keys, not free text.
  'lib/fairs/match.ts': ['EDITION_DIGEST'],
  'lib/retention/policies.ts': ['model.key'],
  'lib/discovery/articles.ts': ['feedId'],
  'app/api/discovery/sources/search/route.ts': ['platform', 't0'],
  // Hardcoded operator-facing labels chosen by the caller (`'[quiz]'`,
  // `'reset'`), never derived from a request or a model.
  'lib/literature/grading.ts': ['logLabel'],
  'lib/papers/pdf.ts': ['logLabel'],
  'lib/discovery/treeApi.ts': ['label'],
  'lib/rate-limit.ts': [
    'requestIdFrom(req)',
    'tierName',
    'userId',
    // Limiter STORE failure. The only thing the Upstash client ever sees is a
    // key of the form `<tier>:user:<id>` / `<tier>:ip:<ip>` — no request body,
    // no model output — so its error text cannot carry student content.
    'err.message',
    'String(err)',
  ],
  'lib/cron/auth.ts': ['requestIdFrom(req)'],
  // Per-request observability (REFACTOR2 P1-5). Every vouched expression here is
  // a bounded operator value, and none is derived from a body or a model:
  // `reason` is the `DenialReason` union, `tier` a `RATE_LIMITS` key, `status`
  // and `started` numbers, `userId`/`dbUserId`/`teamId` opaque ids that
  // `logEvent` hashes at the sink before they reach a line.
  'lib/api/route-context.ts': ['requestIdFrom(req)', 'status', 'tier', 'userId', 'reason'],
  'lib/api/with-route.ts': [
    'requestId',
    'pathname',
    'status',
    'started',
    'opts.tier',
    'dbUserId',
    'teamId',
  ],
  // The instrumented client's own accounting: the operation name and model id
  // are registry constants, `started` is a clock reading, `errDetail` maps to an
  // API status or an error class name.
  'lib/anthropic.ts': ['event', 'model', 'started', 'errDetail(err)'],
  'lib/ai/spend.ts': ['operation'],
  // `err` here is an `onError` CALLBACK parameter, not a catch binding, so the
  // structural rule cannot see it. Both are provider/DB errors, no payload.
  'app/api/papers/[id]/chat/route.ts': ['err'],
  'app/api/ops/vega-study/route.ts': ['err'],
  // `<purpose>/<teamId>/<uuid>.<ext>` — generated server-side; a user-supplied
  // filename never reaches it (see app/api/showcase/asset/route.ts).
  'lib/uploads/assets.ts': ['asset.objectKey'],
}

const collect = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath, e.name))

/** Is this call one of the log sinks the policy governs? */
function logSinkName(node: ts.CallExpression): string | null {
  const callee = node.expression
  if (ts.isIdentifier(callee) && callee.text === 'logEvent') return 'logEvent'
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'console' &&
    /^(log|info|warn|error|debug)$/.test(callee.name.text)
  ) {
    return `console.${callee.name.text}`
  }
  return null
}

/**
 * Collect the INNERMOST expressions that are not provably payload-free.
 *
 * Reporting leaves rather than whole arguments is what keeps `ALLOWLIST`
 * readable and precise: an entry names the one sub-expression a human vouched
 * for (`requestIdFrom(req)`), not the 12-line `logEvent` object around it, so it
 * cannot silently keep vouching for a payload added beside it later.
 *
 * `caught` holds the enclosing `try/catch` bindings.
 */
function collectUnsafe(node: ts.Node, caught: string[], out: ts.Node[]): void {
  const walk = (n: ts.Node) => collectUnsafe(n, caught, out)

  if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node)) return walk(node.expression)
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return walk(node.expression)
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return
  if (ts.isNoSubstitutionTemplateLiteral(node)) return
  if (
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isIdentifier(node) && node.text === 'undefined')
  ) {
    return
  }
  if (ts.isTemplateExpression(node)) return node.templateSpans.forEach((s) => walk(s.expression))
  // A condition is never itself emitted — only the branches are.
  if (ts.isConditionalExpression(node)) return [node.whenTrue, node.whenFalse].forEach(walk)
  if (ts.isBinaryExpression(node)) return [node.left, node.right].forEach(walk)
  if (ts.isPrefixUnaryExpression(node)) return walk(node.operand)
  if (ts.isArrayLiteralExpression(node)) return node.elements.forEach(walk)
  if (ts.isObjectLiteralExpression(node)) {
    // Property NAMES are authored constants; only the VALUES can carry payload.
    for (const p of node.properties) {
      if (ts.isPropertyAssignment(p)) walk(p.initializer)
      else out.push(p) // shorthand / spread / method — not provably safe
    }
    return
  }
  if (ts.isPropertyAccessExpression(node)) {
    // A safe terminal property is safe regardless of what it hangs off: the
    // `.length` of anything is a number, the `.id` of anything is an opaque id.
    if (SAFE_PROPS.has(node.name.text)) return
    // `<anything>.constructor.name` is an ERROR CLASS name, not a person's — the
    // sanctioned redacted form of "what went wrong".
    if (
      node.name.text === 'name' &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'constructor'
    ) {
      return
    }
    out.push(node)
    return
  }
  // `Date.now()` — a clock reading, the one call form that needs no vouching.
  if (
    ts.isCallExpression(node) &&
    node.arguments.length === 0 &&
    node.expression.getText() === 'Date.now'
  ) {
    return
  }
  // Structural, not nominal: this identifier IS the caught error of an
  // enclosing try/catch. Renaming it does not change the answer.
  if (ts.isIdentifier(node) && caught.includes(node.text)) return
  out.push(node)
}

interface Violation {
  file: string
  line: number
  sink: string
  text: string
}

function scan(file: string, rel: string, violations: Violation[]): void {
  const src = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true)
  const allowed = ALLOWLIST[rel] ?? []
  const caught: string[] = []

  const walk = (node: ts.Node): void => {
    let pushed = false
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      const name = node.variableDeclaration.name
      if (ts.isIdentifier(name)) {
        caught.push(name.text)
        pushed = true
      }
    }
    if (ts.isCallExpression(node)) {
      const sink = logSinkName(node)
      if (sink) {
        const unsafe: ts.Node[] = []
        for (const arg of node.arguments) collectUnsafe(arg, caught, unsafe)
        for (const bad of unsafe) {
          const text = bad.getText(sf).replace(/\s+/g, ' ').trim()
          if (allowed.includes(text)) continue
          violations.push({
            file: rel,
            line: sf.getLineAndCharacterOfPosition(bad.getStart(sf)).line + 1,
            sink,
            text,
          })
        }
      }
    }
    ts.forEachChild(node, walk)
    if (pushed) caught.pop()
  }

  walk(sf)
}

describe('log redaction sweep (A7 / P2-S11)', () => {
  const files = SCAN_ROOTS.flatMap(collect)
  const violations: Violation[] = []
  for (const file of files) scan(file, relative(WEB_ROOT, file).split(sep).join('/'), violations)

  it('scans a non-trivial server surface (sweep is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(150)
  })

  it('parses real log calls (the AST walk is not silently finding nothing)', () => {
    let sinks = 0
    for (const file of files) {
      const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
      const count = (n: ts.Node): void => {
        if (ts.isCallExpression(n) && logSinkName(n)) sinks++
        ts.forEachChild(n, count)
      }
      count(sf)
    }
    expect(sinks).toBeGreaterThan(80)
  })

  it('every log-call argument is provably payload-free or explicitly allowlisted', () => {
    const lines = violations.map(
      (v) => `${v.file}:${v.line} → ${v.sink}(… ${v.text.slice(0, 120)} …)`,
    )
    expect(lines, lines.join('\n')).toEqual([])
  })
})
