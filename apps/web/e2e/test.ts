/**
 * The `test` every spec imports — Playwright's, plus a runtime-error sentinel.
 *
 * ## Why
 *
 * Every assertion in this suite is something someone thought to check. Nothing
 * checked the things nobody thinks to assert: an uncaught exception in a click
 * handler, a React hydration mismatch, a 500 from a route the page fetched in
 * the background. A spec that asserts `expect(panel).toBeVisible()` passes just
 * fine while the console fills with errors behind it — and every one of those
 * is a real production bug the browser already found for us.
 *
 * So: fail the test if the page raised an error the spec did not say to expect.
 *
 * ## What counts
 *
 *  - `pageerror`  — an uncaught exception or unhandled promise rejection.
 *  - `console.error` — includes React's hydration and key warnings.
 *  - a **same-origin** 5xx response. Third-party 5xx (Clerk, S3) are somebody
 *    else's outage and would only add flake, so they are ignored.
 *
 * The sentinel stays quiet when the test is already failing: a real assertion
 * failure is a better diagnosis than the console noise that followed it.
 *
 * ## Opting out
 *
 * A spec that DELIBERATELY provokes an error must say so, in the test that does
 * it:
 *
 *     import { test, expect, allowErrors } from './test'
 *
 *     test('the checklist survives a 500', async ({ page }) => {
 *       allowErrors(page, /Failed to load the forms checklist/)
 *       …
 *     })
 *
 * Narrow patterns, not a blanket opt-out: `allowErrors(page)` with no pattern
 * silences the whole test and should be rare enough to argue about in review.
 * The point is that "this route 500s here" becomes an assertion rather than an
 * absence.
 *
 * ## What it does NOT watch
 *
 * The `page` fixture only. A test that builds its own context —
 * `browser.newContext()` for an anonymous viewer, `withSeedPage` for a second
 * role — is unmonitored on that second page. Those are a minority and mostly
 * assert HTTP status rather than render, so this is a known gap rather than an
 * oversight: widen it by attaching the same listeners where those pages are
 * created, if it ever earns its keep.
 */
import { test as base, expect, type Page } from '@playwright/test'

/**
 * Noise that is real but not ours, allowed for every test.
 *
 * Keep this list SHORT and each entry justified — it is the one place a genuine
 * regression can hide. Anything app-owned belongs in a per-test `allowErrors`,
 * where it is visible in the spec that tolerates it.
 */
const ALLOW: RegExp[] = [
  // Anything raised BY Clerk's own bundle. Matches on the source location, which
  // is why console errors carry `[url:line]` below.
  /clerk\.(dev|com|accounts)/i,
  // Clerk's bundle tries to spawn a `blob:` worker on most page loads and our
  // `worker-src 'self'` (next.config.mjs) blocks it, 4-8 times per load. Clerk
  // degrades silently — every auth assertion in this suite passes — so the CSP
  // is left alone rather than growing a `blob:` allowance for a third party's
  // optional worker.
  //
  // Matched on the directive name because the THREE ENGINES WORD IT DIFFERENTLY,
  // and only Chromium names the Clerk script as the source — Firefox and WebKit
  // blame the page, so the rule above misses them. That is not a detail: it is
  // the entire reason both compat lanes went red on the first calibration run.
  /worker-src/,
  // Next's soft-navigation fallback. It says "falling back", and does: the
  // navigation completes over a normal browser request.
  /Failed to fetch RSC payload/,
  // Chrome logs every blocked third-party cookie during Clerk's handshake.
  /third-party cookie/i,
  // A cancelled in-flight fetch is what navigation IS; specs navigate constantly.
  /ERR_ABORTED|The user aborted a request|signal is aborted/i,
  // React DevTools nag, printed once per page load in a production build.
  /Download the React DevTools/i,
]

/** Per-page extra allowances, registered by `allowErrors`. */
const perPage = new WeakMap<Page, RegExp[]>()

/** Per-page "discard what you have seen so far", wired by the fixture below. */
const forget = new WeakMap<Page, () => void>()

/**
 * Discard everything the page has raised SO FAR — for the harness's own
 * bootstrap, not for specs.
 *
 * `e2e/api.ts` boots WebKit by loading the app while signed OUT (clerk.signIn
 * needs ClerkProvider mounted first), and the shell fires its authed fetches
 * during that render: three guaranteed 401s from /api/team/momentum,
 * /api/notifications and /api/team/feedback before the sign-in has happened.
 * They are an artifact of how the harness authenticates, so failing a spec on
 * them reports the harness, not the app.
 *
 * Deliberately NOT `allowErrors(/401/)`: that would tolerate those endpoints for
 * the whole test, including a genuine regression after the spec starts. This
 * only drops what was already recorded, so everything from the spec's own work
 * onward is still caught. Call it exactly once, at the end of the bootstrap.
 */
export function forgetHarnessErrors(page: Page): void {
  forget.get(page)?.()
}

/**
 * Tolerate errors matching `patterns` for the rest of this test.
 *
 * With no patterns, tolerates everything on this page — a blunt instrument;
 * prefer naming the message you expect.
 */
export function allowErrors(page: Page, ...patterns: RegExp[]): void {
  const existing = perPage.get(page) ?? []
  perPage.set(page, [...existing, ...(patterns.length ? patterns : [/.*/])])
}

export const test = base.extend<{ errorSentinel: void }>({
  errorSentinel: [
    async ({ page, baseURL }, use, testInfo) => {
      const seen: string[] = []
      forget.set(page, () => {
        seen.length = 0
      })

      page.on('pageerror', (err) => {
        seen.push(`uncaught: ${err.message}`)
      })
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        // The source location is the difference between "something logged an
        // error" and a fix: it names whether the culprit is app code, a
        // dependency, or the browser itself complaining about a policy.
        const at = msg.location()
        const where = at?.url ? ` [${at.url}:${at.lineNumber}]` : ''
        seen.push(`console.error: ${msg.text()}${where}`)
      })
      page.on('response', (res) => {
        // Same-origin only — see the header note.
        if (res.status() >= 500 && baseURL && res.url().startsWith(baseURL)) {
          seen.push(`HTTP ${res.status()}: ${res.url()}`)
        }
      })

      await use()

      // Calibration aid: E2E_SENTINEL_DEBUG=1 prints everything the page raised,
      // allowed or not. This is how you tune ALLOW without guessing at which
      // pattern swallowed what — run it, read the list, then write the regex.
      if (process.env.E2E_SENTINEL_DEBUG === '1' && seen.length) {
        console.log(`\n[sentinel] ${testInfo.title}\n` + seen.map((e) => `    ${e}`).join('\n'))
      }

      // Already red? The assertion failure is the better message; adding console
      // noise on top of it only buries the diagnosis.
      if (testInfo.status !== testInfo.expectedStatus) return

      const allowed = [...ALLOW, ...(perPage.get(page) ?? [])]
      const unexplained = seen.filter((e) => !allowed.some((p) => p.test(e)))
      if (unexplained.length === 0) return

      // Dedupe: one broken render loop can emit the same line hundreds of times.
      const unique = [...new Set(unexplained)]
      throw new Error(
        `The page raised ${unexplained.length} unexpected error(s) that no assertion covers:\n` +
          unique.map((e) => `  • ${e}`).join('\n') +
          `\n\nIf this is deliberate, declare it in the test:\n` +
          `  allowErrors(page, /some distinctive substring/)`,
      )
    },
    { auto: true },
  ],
})

export { expect }
