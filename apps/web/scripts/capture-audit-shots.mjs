/**
 * Audit helper: screenshot the PUBLIC marketing pages (no auth) at mobile +
 * desktop so we can review responsive layout and catch AI-slop / a11y issues.
 * Output goes to a scratch dir (NOT public/) since these are review artifacts.
 *   node scripts/capture-audit-shots.mjs
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3005'
const OUT = process.env.OUT_DIR ?? '/private/tmp/claude-501/-path-to-scienium/ab9fe080-44f8-4441-a6b9-39bdeebe3b92/scratchpad/audit'
fs.mkdirSync(OUT, { recursive: true })

const PAGES = [
  { route: '/', name: 'home' },
]
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]

const browser = await chromium.launch()
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  for (const pg of PAGES) {
    await page.goto(BASE + pg.route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(1200)
    // settle reveal-on-scroll: scroll to bottom then back so everything is revealed
    await page.evaluate(async () => {
      const step = () => new Promise((r) => setTimeout(r, 120))
      for (let y = 0; y <= document.body.scrollHeight; y += window.innerHeight) { window.scrollTo(0, y); await step() }
      window.scrollTo(0, 0); await step()
    })
    await page.waitForTimeout(400)
    const file = path.join(OUT, `${pg.name}-${vp.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log('  ok', path.basename(file))
  }
  await ctx.close()
}
await browser.close()
console.log('done ->', OUT)
