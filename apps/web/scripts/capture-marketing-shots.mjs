/**
 * Capture REAL in-game screenshots for the marketing site.
 *
 * Reuses the E2E Clerk sessions (e2e/.auth/{leader,teacher}.json) to drive the
 * live dev server and screenshot actual product surfaces into public/marketing/.
 * Run AFTER `playwright test --project=setup` has written the .auth sessions and
 * with the dev server up:  node scripts/capture-marketing-shots.mjs
 *
 * Env: BASE_URL (default http://localhost:3005)
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(__dirname, '..')
const OUT = path.join(WEB, 'public', 'marketing')
const AUTH = path.join(WEB, 'e2e', '.auth')
const BASE = process.env.BASE_URL ?? 'http://localhost:3005'

fs.mkdirSync(OUT, { recursive: true })

// Hide dev-only floating controls so shots read as the real product, not a dev build.
const HIDE_DEV = () => {
  const kill = ['DEV', 'FEEDBACK', 'LOG']
  document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
    const t = (el.textContent || '').trim()
    if (kill.includes(t) && el.getBoundingClientRect().width < 220) el.style.visibility = 'hidden'
  })
}

async function shot(page, route, name, { wait = 2200, full = false } = {}) {
  try {
    // domcontentloaded (not networkidle): /lab and /teacher poll forever, so
    // networkidle never resolves. A fixed settle wait handles render instead.
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(wait)
    await page.evaluate(HIDE_DEV).catch(() => {})
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full })
    console.log(`  ok   ${name}  <- ${route}`)
    return true
  } catch (e) {
    console.log(`  FAIL ${name}  <- ${route}  (${e.message.split('\n')[0]})`)
    return false
  }
}

async function run() {
  const browser = await chromium.launch()

  // ---- Leader session: the lab + student-facing feature surfaces ----
  const leader = await browser.newContext({
    storageState: path.join(AUTH, 'leader.json'),
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  })
  const p = await leader.newPage()

  await shot(p, '/lab', 'lab', { wait: 5000 })
  await shot(p, '/daily/codex', 'codex-library')
  await shot(p, '/fair-hub/rubric', 'rubric')
  await shot(p, '/discovery', 'discovery')
  await shot(p, '/research-plan', 'research-plan')
  await shot(p, '/literature/library', 'literature')
  await shot(p, '/fair-hub/calendar', 'fair-calendar')

  // Try to reach an actual Codex lesson (prose + checkpoint) via clicks.
  try {
    await p.goto(BASE + '/daily/codex', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1200)
    const browse = p.getByRole('button', { name: /browse full library/i })
    if (await browse.count()) { await browse.first().click(); await p.waitForTimeout(800) }
    const field = p.getByRole('button', { name: /acoustics/i })
    if (await field.count()) { await field.first().click(); await p.waitForTimeout(800) }
    await p.evaluate(HIDE_DEV).catch(() => {})
    await p.screenshot({ path: path.join(OUT, 'codex-track.png') })
    console.log('  ok   codex-track (clicked)')
    const lesson = p.getByRole('button', { name: /longitudinal pressure wave|sound as a/i })
    if (await lesson.count()) {
      await lesson.first().click(); await p.waitForTimeout(900)
      await p.evaluate(HIDE_DEV).catch(() => {})
      await p.screenshot({ path: path.join(OUT, 'codex-lesson.png') })
      console.log('  ok   codex-lesson (clicked)')
    }
  } catch (e) { console.log('  FAIL codex-lesson click flow:', e.message.split('\n')[0]) }

  await leader.close()

  // ---- Teacher session: the real classroom dashboard ----
  const teacher = await browser.newContext({
    storageState: path.join(AUTH, 'teacher.json'),
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  })
  const t = await teacher.newPage()
  await shot(t, '/teacher', 'teacher')
  await shot(t, '/teacher/reports', 'teacher-reports')
  await teacher.close()

  await browser.close()

  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png'))
  console.log(`\nWrote ${files.length} shots to public/marketing:`)
  for (const f of files) {
    const kb = Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
    console.log(`  ${f}  (${kb} KB)`)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
