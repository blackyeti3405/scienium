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
import fs from 'node:fs'

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
  // Sentry's tunnel route, which WebKit refuses: "due to access control checks".
  // Confirmed against a PRODUCTION build, not just dev. It currently escapes
  // notice only because it fires inside the window `forgetHarnessErrors` clears
  // — so any spec that navigates again after bootstrap would trip on it.
  //
  // Allowed rather than fixed because a blocked telemetry beacon is not what
  // these specs assert. It does mean WebKit/Safari clients may not deliver error
  // reports to Sentry at all — a real observability gap, tracked as product work
  // rather than papered over here.
  /\/monitoring\?/,
]

/**
 * Tolerated on WebKit ONLY, because the harness puts WebKit somewhere no user
 * goes — this is not a product allowance and must not migrate into ALLOW.
 *
 * WebKit is the one engine that cannot ride a restored `storageState` session
 * (`isWebKit` in e2e/api.ts), so it alone signs in IN-PAGE and then has
 * `__client_uat` written into its jar BY HAND, because the browser refuses to
 * store Clerk's `Domain=localhost` copy. That cookie is what the client uses to
 * guess "am I signed in" before clerk-js finishes loading. A hand-mirrored value
 * can disagree with what the SERVER just rendered from the real session, and any
 * component branching on auth state then renders differently on the two sides:
 * React #418, roughly one run in ten. React recovers by re-rendering the subtree
 * on the client, which is why every assertion in the lane still passes.
 *
 * Waiting for `window.Clerk.session` before navigating (e2e/api.ts) removed the
 * 401s this used to arrive with; it did not remove the mismatch, and chasing it
 * further means debugging our own cookie workaround rather than the product.
 *
 * REVISIT IF THIS APPEARS ON CHROMIUM OR FIREFOX. Those restore a real session
 * and never mirror a cookie, so a hydration error there is a genuine product bug
 * and this tolerance would be hiding nothing — it is scoped to WebKit precisely
 * so that signal survives.
 */
const WEBKIT_ONLY: RegExp[] = [
  /Minified React error #418|hydrat/i,
  // The same fabricated jar, one symptom earlier: the shell's own boot fetches
  // can go out while the session is still settling and come back 401. Waiting for
  // `window.Clerk.session` before navigating (e2e/api.ts) cleared these on macOS
  // WebKit 10 runs out of 10; Linux WebKit still leaks the first one, usually
  // `momentum`, because the cookie it is authenticating with is one we wrote
  // ourselves rather than one the browser accepted.
  //
  // Pinned to the three shell endpoints rather than a bare /401/, so an
  // unexpected 401 anywhere else still fails this lane. And the same spec runs on
  // Chromium and Firefox with a real session, where a genuine 401 regression on
  // these endpoints WOULD fail — the signal survives on two engines of three.
  /401 \(Unauthorized\).*\/api\/(team\/(momentum|feedback)|notifications)/,
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

      // A hydration error in a PRODUCTION build is "Minified React error #418"
      // and nothing else — no component, no element, no text. That is why the
      // WebKit one seen on 2026-08-15 could not be chased: it appeared once in
      // ~14 loads and left nothing to look at. Capture the two documents whose
      // disagreement IS the bug, so the next occurrence is diffable instead of
      // merely annoying. Best-effort: diagnostics must never mask the failure.
      if (seen.some((e) => /418|423|425|hydrat/i.test(e))) {
        try {
          const url = page.url()
          const client = await page.content()
          const server = await page.request.get(url).then((r) => r.text())
          // Written with fs into the test's own output dir rather than
          // `testInfo.attach`: attach from a fixture teardown produced no files
          // in CI on the 2026-08-15 run that DID hit this branch, and a
          // diagnostic that silently writes nothing is worse than none.
          // `test-results/` is what the workflow uploads.
          fs.writeFileSync(testInfo.outputPath('hydration-client-dom.html'), client)
          fs.writeFileSync(testInfo.outputPath('hydration-server-html.html'), server)
          console.log(
            `[sentinel] hydration mismatch on ${url} — wrote client/server HTML to ${testInfo.outputDir}`,
          )
        } catch (err) {
          // Never mask the real failure, but say so: a silent catch here is how
          // the previous attempt looked like it worked.
          console.warn(`[sentinel] could not capture hydration HTML: ${String(err).slice(0, 200)}`)
        }
      }

      // Already red? The assertion failure is the better message; adding console
      // noise on top of it only buries the diagnosis.
      if (testInfo.status !== testInfo.expectedStatus) return

      const isWebKit = page.context().browser()?.browserType().name() === 'webkit'
      const allowed = [...ALLOW, ...(isWebKit ? WEBKIT_ONLY : []), ...(perPage.get(page) ?? [])]
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
