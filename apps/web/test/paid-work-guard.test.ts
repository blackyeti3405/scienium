import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Static sweep (PILOT-2): every API route that can reach an Anthropic call —
 * directly or through a lib that imports `@/lib/anthropic` — must carry a paid
 * guard: the `ai` or `upload` rate tier (fail-closed in production without a
 * shared limiter store), an explicit `enforceRateLimit(req, 'ai', …)` before
 * the paid call, or `assertCron` (system-invoked, bounded batches).
 *
 * This is how the advance-phase / discovery-promote / topic-wipe gaps shipped:
 * the route's verb-shaped tier (`read`/`mutate`) said nothing about the paid
 * work behind it. The sweep makes that class of regression fail CI.
 *
 * Deliberately coarse: it requires at least one paid marker per route FILE,
 * not per handler. A route with a guarded POST and an unguarded GET would
 * pass — handler-level enforcement stays a review concern.
 */

const WEB_ROOT = join(__dirname, '..')

function collectFiles(dir: string, name: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...collectFiles(p, name))
    else if (name === '*' ? entry.endsWith('.ts') : entry === name) out.push(p)
  }
  return out
}

/**
 * `@/lib/...` specifiers of every lib module that can reach the Anthropic client,
 * computed as a TRANSITIVE closure: modules importing `@/lib/anthropic`, plus
 * modules importing those, and so on to a fixed point.
 *
 * One hop is not enough. Extracting a route's workflow into an application service
 * (REFACTOR2 §3.2 E) puts a new lib module between the route and the paid lib — so
 * a one-hop sweep stops seeing the route and silently drops its assertion, exactly
 * when the code is being moved around and most needs the net. Closing over the
 * graph keeps the guarantee stable across those extractions.
 */
function paidLibSpecifiers(): string[] {
  const libs = collectFiles(join(WEB_ROOT, 'lib'), '*').filter((p) => !p.endsWith('.test.ts'))
  const specOf = (p: string) => '@/' + relative(WEB_ROOT, p).replace(/\.ts$/, '')
  const sources = new Map(libs.map((p) => [p, readFileSync(p, 'utf8')]))

  const paid = new Set(
    libs.filter((p) => sources.get(p)!.includes("from '@/lib/anthropic'")).map(specOf),
  )

  // Fixed point: keep adding modules that import anything already known to be paid.
  for (;;) {
    let grew = false
    for (const p of libs) {
      const spec = specOf(p)
      if (paid.has(spec)) continue
      if ([...paid].some((s) => sources.get(p)!.includes(`from '${s}'`))) {
        paid.add(spec)
        grew = true
      }
    }
    if (!grew) break
  }

  return [...paid]
}

const PAID_MARKERS = [
  /tier:\s*'ai'/,
  /tier:\s*'upload'/,
  /enforceRateLimit\(\s*req,\s*'ai'/,
  /assertCron\s*\(/,
]

describe('paid-work guard sweep', () => {
  const paidLibs = paidLibSpecifiers()
  const routes = collectFiles(join(WEB_ROOT, 'app', 'api'), 'route.ts')
  const paidRoutes = routes.filter((p) => {
    const src = readFileSync(p, 'utf8')
    return (
      src.includes("from '@/lib/anthropic'") ||
      paidLibs.some((spec) => src.includes(`from '${spec}'`))
    )
  })

  it('finds Anthropic-backed libs and routes (sweep is not vacuous)', () => {
    expect(paidLibs.length).toBeGreaterThan(3)
    expect(paidRoutes.length).toBeGreaterThan(10)
  })

  it.each(paidRoutes.map((p) => relative(WEB_ROOT, p)))(
    '%s carries a paid-work guard',
    (routeRel) => {
      const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
      expect(
        PAID_MARKERS.some((m) => m.test(src)),
        `route reaches Anthropic but has no paid tier / enforceRateLimit(req, 'ai') / assertCron`,
      ).toBe(true)
    },
  )

  it('paper detail GET stays a pure status read (no paid processing on read)', () => {
    const src = readFileSync(join(WEB_ROOT, 'app', 'api', 'papers', '[id]', 'route.ts'), 'utf8')
    expect(src).not.toMatch(/processPaperJob/)
  })
})
