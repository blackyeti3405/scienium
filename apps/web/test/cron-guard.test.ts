import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Static sweep (SEC-10): every cron route must call `assertCron` — a scheduled
 * endpoint that forgets the guard is a world-open mutation with paid API
 * access. This walks every route.ts under app/api/cron so adding a new cron
 * route without the guard fails CI, not code review.
 */
function collectRoutes(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...collectRoutes(p))
    else if (entry === 'route.ts') out.push(p)
  }
  return out
}

describe('cron route protection', () => {
  const cronDir = join(__dirname, '..', 'app', 'api', 'cron')
  const routes = collectRoutes(cronDir)

  it('finds at least one cron route (sweep is not vacuous)', () => {
    expect(routes.length).toBeGreaterThan(0)
  })

  it.each(routes)('%s calls assertCron', (route) => {
    const src = readFileSync(route, 'utf8')
    expect(src).toMatch(/assertCron\s*\(/)
  })
})
