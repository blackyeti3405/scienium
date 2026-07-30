import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Static sweep: EVERY API route must carry a recognized auth guard.
 *
 * The 0.28.0 IDOR sweep found the codebase safe by convention — every route
 * happened to call a guard. This test is what keeps that true: a new
 * `app/api/**\/route.ts` that queries Prisma with no `requireTeamContext` /
 * `requireTeacher` / `requireUserContext` / `withTeamRoute` / `assertCron`
 * fails CI instead of shipping a world-readable route.
 *
 * Two deliberate exceptions, each pinned to its compensating control below so
 * the allowlist can't silently rot into a bypass.
 */

const WEB_ROOT = join(__dirname, '..')
const GUARD_MARKERS =
  /requireTeamContext|withTeamRoute|requireUserContext|requireTeacher|assertCron/

/** route (repo-relative) → the compensating-control text that must be present. */
const PUBLIC_ALLOWLIST: Record<string, RegExp> = {
  // Dev-only backfill: refuses to exist in production, authenticates inline.
  'app/api/dev/backfill-me/route.ts': /NODE_ENV\s*===\s*'production'/,
  // Deliberately public gallery asset: privacy enforced by canViewShowcase.
  'app/api/showcase/public/asset/route.ts': /canViewShowcase/,
  // Deliberately anonymous abuse reporting (REFACTOR2 P1-6) — the audience for
  // a public showcase has no account here, so requiring one would mean only the
  // students could report. Same compensating control as the asset route: only a
  // showcase an anonymous visitor could actually OPEN can be reported, so this
  // is not an oracle for private drafts. Rate limiting, a per-identity unique
  // key and a per-showcase ceiling bound the rest.
  'app/api/showcase/public/report/route.ts': /canViewShowcase/,
  // E2E preflight probe. Unauthenticated ON PURPOSE — it is what the Playwright
  // preflight calls to prove it is talking to a stub-mode server before any test
  // runs. Its compensating control is stronger than a guard: the route only
  // EXISTS when `E2E_SKIP_LLM=1`, so a production process 404s it, and it
  // returns no secret — a hash of the database identity, never the URL.
  'app/api/dev/e2e-health/route.ts': /E2E_SKIP_LLM\s*!==\s*'1'/,
}

const collectRoutes = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name === 'route.ts')
    .map((e) => join(e.parentPath, e.name))

describe('route guard sweep', () => {
  const routes = collectRoutes(join(WEB_ROOT, 'app', 'api')).map((p) => relative(WEB_ROOT, p))
  const guarded = routes.filter((r) => !(r in PUBLIC_ALLOWLIST))

  it('finds the full route surface (sweep is not vacuous)', () => {
    expect(routes.length).toBeGreaterThan(90)
  })

  it.each(guarded)('%s carries an auth guard', (routeRel) => {
    const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
    expect(
      GUARD_MARKERS.test(src),
      'route has no requireTeamContext / requireTeacher / requireUserContext / withTeamRoute / assertCron — add one, or add the route to PUBLIC_ALLOWLIST with its compensating control',
    ).toBe(true)
  })

  it.each(Object.entries(PUBLIC_ALLOWLIST))(
    'allowlisted %s still carries its compensating control',
    (routeRel, control) => {
      const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
      expect(src).toMatch(control)
    },
  )

  // A team-scoped guard on a teacher route would pass the generic sweep while
  // silently breaking class scoping — teacher routes must use requireTeacher.
  const teacherRoutes = routes.filter((r) => r.startsWith(join('app', 'api', 'teacher') + '/'))

  it('finds the teacher route surface (sweep is not vacuous)', () => {
    expect(teacherRoutes.length).toBeGreaterThanOrEqual(10)
  })

  it.each(teacherRoutes)('%s uses requireTeacher specifically', (routeRel) => {
    const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
    expect(src).toMatch(/requireTeacher\s*\(/)
  })
})

/**
 * A route module may only export the framework's own names.
 *
 * `export const MAX_EXPERIMENTS_PER_TEAM = 200` in a route file typechecks and
 * lints cleanly, then fails `next build` with "not a valid Route export field"
 * — twelve minutes into the E2E lane, which is where it actually cost us. The
 * legitimate reason to reach for it is a test wanting the constant; the fix is
 * to put the constant in `lib/` and import it from both sides.
 */
describe('route modules export only Next.js route fields', () => {
  const ALLOWED = new Set([
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
    'dynamic',
    'dynamicParams',
    'revalidate',
    'fetchCache',
    'runtime',
    'preferredRegion',
    'maxDuration',
    'generateStaticParams',
  ])
  const EXPORT_NAME =
    /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm

  const routes = collectRoutes(join(WEB_ROOT, 'app', 'api')).map((f) => relative(WEB_ROOT, f))

  it.each(routes)('%s', (routeRel) => {
    const src = readFileSync(join(WEB_ROOT, routeRel), 'utf8')
    const offenders = [...src.matchAll(EXPORT_NAME)]
      .map((m) => m[1]!)
      .filter((name) => !ALLOWED.has(name))
    expect(offenders).toEqual([])
  })
})
