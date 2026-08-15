import type {
  APIRequestContext,
  APIResponse,
  Browser,
  Page,
  Request,
  Response,
} from '@playwright/test'
import { expect } from '@playwright/test'
import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'
import { STORAGE, getAccounts, signInTicket, type Role } from './roles'
import { forgetHarnessErrors } from './test'

const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
const LANDING: Record<Role, string> = { leader: '/lab', student: '/lab', teacher: '/teacher' }

/**
 * Preferred E2E test-team id by convention (matches F1.spec.ts / upgrades.spec.ts),
 * with a fallback to any team present in the roster — the roster's actual team id
 * is a DB-generated cuid (e.g. cmr1du8fs0002gn0jmvlvy8e8), not this literal, so the
 * exact-match branch is aspirational/documentary and the fallback is load-bearing.
 * Single source of truth so every spec's seed helpers resolve identically.
 */
export const PREFERRED_TEST_TEAM_ID = 'e2e_test_lab_01'

/** Resolve the E2E team id from a teacher-roster `students` list: preferred id, else first team with any id, else null. */
export function resolveTeamId(students: Array<{ teamId: string | null }>): string | null {
  return (
    students.find((s) => s.teamId === PREFERRED_TEST_TEAM_ID)?.teamId ??
    students.find((s) => s.teamId)?.teamId ??
    null
  )
}

/**
 * Which role a page is signed in as, so session recovery can re-authenticate
 * with the right credentials. `withSeedPage` registers its role; the default
 * `chromium` project's `page` fixture always carries the leader storageState
 * (see playwright.config.ts), so 'leader' is the correct fallback.
 */
const PAGE_ROLE = new WeakMap<Page, Role>()

/**
 * Register which role a page is signed in as. `withSeedPage` does this
 * automatically; specs whose MAIN `page` fixture is not the leader (e.g. a
 * `test.use({ storageState: STORAGE.teacher })` block) must call this in
 * `beforeEach` so session recovery re-authenticates with the right account.
 */
export function registerPageRole(page: Page, role: Role): void {
  PAGE_ROLE.set(page, role)
}

/**
 * Clerk's session JWT (the `__session` cookie) is short-lived and only
 * refreshes when clerk-js runs inside a live page. Playwright's saved
 * `storageState` is a frozen snapshot, so a `page.request.*` call made long
 * enough after the last navigation carries a stale token and gets silently
 * redirected to sign-in (307, not 401 — see middleware.ts) instead of
 * returning JSON. `page.request` shares the browsing context's cookie jar
 * with `page`, so refreshing the token from inside the page — no
 * navigation, no lost DOM/app state — keeps every call below fresh
 * automatically.
 */
/**
 * Ensure the page has actually loaded the app before we try to refresh a token
 * from inside it.
 *
 * A `page` fixture starts on `about:blank`. clerk-js has never booted there, so
 * `refreshClerkSession` can only burn its full 5s `waitForFunction` budget and
 * give up, and the call then rides the frozen `storageState` token. Once that
 * token's ~60s TTL has lapsed — which it has by the tenth test of a serial file —
 * the request 307s and the escalating recovery ladder fires: ~10-15s in
 * `forceSessionRecovery`, then another ~5-8s re-signing in. That is ~26s of a
 * 30s default test budget spent before the spec's real work begins.
 *
 * `withSeedPage` never pays it because it navigates first (see below), which is
 * why only the specs that call `api.*` / `gotoFresh` on a bare `page` are slow.
 * Booting the app here makes those paths behave the same way: the token is minted
 * live by clerk-js, so the ladder never runs at all.
 *
 * On WebKit that boot is a real sign-in instead — see `isWebKit` below.
 */
async function ensureAppLoaded(page: Page): Promise<void> {
  if (page.url().startsWith(BASE_URL)) return
  if (isWebKit(page)) {
    console.warn('[e2e/api] webkit cannot restore a saved Clerk session — signing in in-page')
    await signInProgrammatically(page)
    // That sign-in booted the app signed OUT on its way in, so the shell fired
    // its authed fetches and collected guaranteed 401s. They belong to the
    // harness, not the spec — drop them before the spec's own work begins, so
    // the sentinel still catches anything raised from here on. Bootstrap only:
    // the mid-test `reauthenticate` path deliberately does NOT do this.
    forgetHarnessErrors(page)
    return
  }
  const role = PAGE_ROLE.get(page) ?? 'leader'
  await page.goto(LANDING[role]).catch(() => {
    // A failed boot is not fatal on its own — the caller's own request (or the
    // recovery ladder behind it) still gets to report the real problem.
  })
}

/**
 * WebKit cannot ride a saved Clerk session, so it signs in for real.
 *
 * A `storageState` snapshot always carries an EXPIRED `__session` (the JWT lives
 * ~60s; the state was written minutes earlier), and every engine leans on Clerk's
 * handshake to repair that on the first document request. On WebKit the handshake
 * is not merely useless but destructive: its host-only `__client_uat=` deletion
 * IS accepted while the `Domain=localhost` replacement is NOT (see
 * `mirrorClientUat`), so the one restored cookie that was working is spent and
 * every following request re-handshakes until Clerk gives up on /sign-in.
 *
 * Signing in inside the page instead mints a live token, so no handshake is ever
 * attempted and the restored cookie is never destroyed. Costs one extra sign-in
 * on the one read-only spec `webkit-compat` runs; no other project is touched.
 */
function isWebKit(page: Page): boolean {
  return page.context().browser()?.browserType().name() === 'webkit'
}

async function refreshClerkSession(page: Page): Promise<void> {
  try {
    // Wait (bounded) for clerk-js to boot a session on a just-navigated page. Without
    // this, `getToken` runs before `window.Clerk.session` exists, silently no-ops, and
    // the request rides the frozen storageState token — which 307s to /sign-in once its
    // ~60s TTL lapses (Playwright then follows the redirect and reads a 200 sign-in page).
    await page
      .waitForFunction(() => Boolean((window as { Clerk?: { session?: unknown } }).Clerk?.session), null, {
        timeout: 5_000,
      })
      .catch(() => {})
    await page.evaluate(async () => {
      const clerk = (window as unknown as {
        Clerk?: { session?: { getToken(opts: { skipCache: boolean }): Promise<unknown> } }
      }).Clerk
      await clerk?.session?.getToken({ skipCache: true })
    })
  } catch {
    // No live Clerk instance on this page (e.g. a pre-navigation blank page) — nothing to refresh.
  }
}

/**
 * A stale-session request doesn't fail — middleware 307s it to /sign-in and
 * Playwright follows, so the caller sees `ok() === true` with an HTML page
 * where JSON was expected (`Unexpected token '<'` at parse time). Two tells,
 * either sufficient:
 *  - the final URL landed on /sign-in (the redirect chain can also continue
 *    PAST /sign-in to a landing page, so this alone is not enough);
 *  - the call targeted an /api/ route but the response is text/html — no API
 *    route in this app ever legitimately answers HTML, so an HTML body means
 *    the request was redirected somewhere else entirely.
 */
function staleSessionResponse(requestedUrl: string, res: APIResponse): boolean {
  if (res.url().includes('/sign-in')) return true
  const requestedPath = new URL(requestedUrl, BASE_URL).pathname
  if (!requestedPath.startsWith('/api/')) return false
  const contentType = res.headers()['content-type'] ?? ''
  return contentType.includes('text/html')
}

/** Bounded wait for clerk-js to boot a live session on the current document. */
async function waitForClerkSession(page: Page, timeout: number): Promise<void> {
  await page
    .waitForFunction(() => Boolean((window as { Clerk?: { session?: unknown } }).Clerk?.session), null, {
      timeout,
    })
    .catch(() => {})
}

/**
 * Strongest available recovery: a real navigation reboots clerk-js, which
 * rotates the `__session` cookie shared with `page.request`. The pre-call
 * `refreshClerkSession` can silently no-op (clerk-js wedged or never booted on
 * this page); a reload cannot.
 *
 * The reload's own document request rides the SAME stale cookie, so middleware
 * may bounce the page to /sign-in, where clerk-js (whose client session is
 * still valid) auto-returns to the app. Retrying before that chain settles
 * re-sends the stale cookie and fails identically — so wait for a live Clerk
 * session, and if the page is still parked on /sign-in, hop back to the app
 * URL explicitly before refreshing the token.
 */
async function forceSessionRecovery(page: Page): Promise<void> {
  try {
    const target = page.url()
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await waitForClerkSession(page, 10_000)
    if (page.url().includes('/sign-in') && !target.includes('/sign-in')) {
      await page.goto(target, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await waitForClerkSession(page, 10_000)
    }
  } catch {
    // Blank or closed page — the plain refresh below is the best remaining shot.
  }
  await refreshClerkSession(page)
}

/**
 * Last-resort recovery: a full programmatic re-sign-in with the page's role
 * credentials — the same supported @clerk/testing path auth.setup.ts uses.
 * Reached only when clerk-js could not refresh the session at all (observed on
 * dev instances deep into long serial files: the reload's own document request
 * bounces to /sign-in and the token refresh never lands). Navigates the page,
 * so any DOM state is lost — acceptable, since every request from this page
 * would otherwise fail.
 */
async function reauthenticate(page: Page): Promise<void> {
  console.warn(
    `[e2e/api] session unrecoverable — re-signing in programmatically as ${PAGE_ROLE.get(page) ?? 'leader'}`,
  )
  await signInProgrammatically(page)
}

/** The sign-in itself, with no "recovery" framing — also the WebKit first-load path. */
async function signInProgrammatically(page: Page): Promise<void> {
  const role = PAGE_ROLE.get(page) ?? 'leader'
  const acct = getAccounts().find((a) => a.role === role)!
  // The Testing Token is normally minted by auth.setup.ts's clerkSetup, which
  // runs in a different worker process — fetch one here if this worker lacks it.
  if (!process.env.CLERK_TESTING_TOKEN) {
    await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY })
  }
  await setupClerkTestingToken({ page })
  // Drop the dead session cookies FIRST. We are about to mint a new session, so
  // the only thing a stale `__session` can still do is make middleware attempt a
  // handshake on the navigation below — the very repair that cannot complete on
  // WebKit (see isWebKit above), where it loops to /sign-in and takes the
  // sign-in page's own `page.goto` down with it. `__clerk_db_jwt` stays: it is
  // the long-lived dev-browser token clerk-js needs to talk to FAPI.
  await page
    .context()
    .clearCookies({ name: /^__(session|client_uat|refresh)/ })
    .catch(() => {})
  await page.goto('/')
  await clerk.signOut({ page }).catch(() => {}) // a half-dead session blocks signIn
  // Ticket, not password — same reason auth.setup.ts uses one (`signInTicket` in
  // ./roles.ts). This is the WebKit first-load path, where a password sign-in that
  // stops at `needs_second_factor` creates no session and leaves middleware
  // handshaking `session-token-but-no-client-uat` until `page.goto` times out.
  await clerk.signIn({ page, signInParams: { strategy: 'ticket', ticket: await signInTicket(acct.identifier) } })
  await mirrorClientUat(page)
  // Land on the role's own surface before returning. clerk-js's `setActive`
  // navigates to the after-sign-in URL on its own schedule; absorbing that here
  // means the caller's next `page.goto` (or `page.request`) is not racing it.
  await gotoSettled(page, LANDING[role])
}

/**
 * Put `__client_uat` in the cookie jar by hand when the browser refused to store it.
 *
 * Clerk domain-scopes exactly this one cookie (`Domain=localhost`) and leaves the
 * rest host-only. WebKit's Linux jar drops a `Domain` attribute on a single-label
 * host, and CI's trace shows the split precisely: from one Set-Cookie response
 * every host-only cookie lands and `__client_uat` does not — same outcome whether
 * it comes from Clerk's handshake or from clerk-js in-page, so signing in does not
 * help either. Middleware then sees a session token with no `__client_uat`,
 * handshakes, gets the same result, and loops until Clerk gives up on /sign-in.
 * On Linux WebKit a localhost session can therefore never authenticate unaided.
 *
 * Playwright's cookie API writes straight into the jar, past the Set-Cookie domain
 * rules, so the harness can supply what the browser would not keep. `__client_uat`
 * only records when the client was last updated, and Clerk re-handshakes solely if
 * it is NEWER than the session token — so the token's own `iat` is always safe, and
 * stays safe as clerk-js rotates to later tokens. A no-op on every engine that
 * accepted the cookie, which is why this needs no engine check.
 */
async function mirrorClientUat(page: Page): Promise<void> {
  let cookies = await page.context().cookies(BASE_URL)
  if (cookies.some((c) => c.name.startsWith('__client_uat'))) return

  // clerk-js writes `__session` asynchronously, after `setActive` resolves. Run
  // before that lands and there is nothing to mirror FROM: this returned having
  // added nothing, the cookie appeared a moment later, and the next navigation
  // went out with a session token and no `__client_uat` — which is precisely the
  // `__clerk_hs_reason=session-token-but-no-client-uat` handshake loop this
  // function exists to prevent. Wait (bounded) for something to mirror.
  const hasSession = (cs: typeof cookies) =>
    cs.some((c) => c.name === '__session' || c.name.startsWith('__session_'))
  for (let i = 0; i < 20 && !hasSession(cookies); i++) {
    await page.waitForTimeout(100)
    cookies = await page.context().cookies(BASE_URL)
    // A late-arriving real cookie is better than a mirrored one — stop either way.
    if (cookies.some((c) => c.name.startsWith('__client_uat'))) return
  }
  // One per `__session` cookie: dev instances also carry an instance-suffixed
  // pair (`__session_-Y45bENH` / `__client_uat_-Y45bENH`), and which pair
  // middleware reads depends on both being present.
  const mirrored = []
  for (const cookie of cookies) {
    if (cookie.name !== '__session' && !cookie.name.startsWith('__session_')) continue
    const iat = issuedAt(cookie.value)
    if (iat === null) continue
    mirrored.push({
      name: cookie.name.replace('__session', '__client_uat'),
      value: String(iat),
      url: BASE_URL,
    })
  }
  if (mirrored.length === 0) return
  console.warn(`[e2e/api] browser would not store __client_uat — writing it into the jar directly`)
  await page.context().addCookies(mirrored)
}

/** `iat` out of a JWT payload, or null if it is not a JWT we can read. */
function issuedAt(jwt: string): number | null {
  try {
    const payload: unknown = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString())
    const iat = (payload as { iat?: unknown }).iat
    return typeof iat === 'number' ? iat : null
  } catch {
    return null
  }
}

/**
 * `page.goto` that survives a client-side redirect landing mid-navigation.
 *
 * clerk-js's post-sign-in `setActive` navigates the Next router to the
 * after-sign-in URL; when its RSC fetch loses the race Next falls back to a HARD
 * browser navigation ("Failed to fetch RSC payload … Falling back to browser
 * navigation" — CI's WebKit console), which aborts whatever `goto` is in flight
 * and fails the spec with "interrupted by another navigation". The navigation
 * itself is healthy and a GET is idempotent, so retry once.
 */
async function gotoSettled(page: Page, url: string): Promise<Response | null> {
  try {
    return await page.goto(url)
  } catch (error) {
    if (!/interrupted by another navigation/.test(String(error))) throw error
    return await page.goto(url)
  }
}

async function refreshed(
  page: Page,
  url: string,
  run: () => Promise<APIResponse>,
): Promise<APIResponse> {
  await ensureAppLoaded(page)
  await refreshClerkSession(page)
  let res = await run()
  if (!staleSessionResponse(url, res)) return res

  // Escalating, loudly-logged recovery. Mutations are safe to retry here — a
  // stale-session request never reached its route (the auth middleware
  // redirected it away). A genuinely broken account still fails loudly:
  // clerk.signIn throws on bad credentials, and a stale response after all
  // recovery attempts fails in the caller exactly as before.
  console.warn(
    `[e2e/api] stale Clerk session — ${url} answered from ${res.url()} as ${
      res.headers()['content-type'] ?? 'unknown'
    }; reloading page and retrying`,
  )
  await forceSessionRecovery(page)
  res = await run()
  if (!staleSessionResponse(url, res)) return res

  await reauthenticate(page)
  return run()
}

/**
 * Navigate with a verified-fresh session. A stale `__session` cookie bounces
 * the DOCUMENT request through /sign-in, and Clerk's auto-return lands on the
 * fallback surface (/lab) instead of the requested page — the spec then fails
 * on a visibility assertion while sitting on the wrong URL. Refresh before
 * navigating, and re-sign-in + retry once if the navigation was hijacked. Use
 * for leader-page navigations that follow a long detour (e.g. a `withSeedPage`
 * teacher block) in long serial files.
 */
export async function gotoFresh(page: Page, url: string): Promise<void> {
  await ensureAppLoaded(page)
  await refreshClerkSession(page)
  // Last thing before the document request, because that request is what
  // handshakes. `refreshClerkSession` rotates the session token, and on an engine
  // that would not store `__client_uat` the rotation leaves the pair mismatched
  // again — mirroring at sign-in time only is not enough. A no-op wherever the
  // browser kept the real cookie, which is every engine but Linux WebKit.
  await mirrorClientUat(page)
  const res = await gotoSettled(page, url)
  if (!hijackedBySignIn(page, res)) return
  console.warn(
    `[e2e/api] navigation to ${url} landed on ${page.url()} (stale session) — re-signing in and retrying`,
  )
  await reauthenticate(page)
  await gotoSettled(page, url)
}

/**
 * Did the auth middleware hijack this navigation? The tell is /sign-in appearing
 * in it — either as the page we are parked on, or anywhere in the redirect chain
 * (a stale session 307s the document request to /sign-in, where clerk-js
 * auto-returns to the fallback surface, so the final URL alone can look
 * innocent).
 *
 * NOT "the final path differs from the requested one", which is what this used
 * to check: an app redirect is not a hijack. `/dashboard` legitimately redirects
 * to `/lab`, so `gotoFresh(page, '/dashboard')` declared a stale session and
 * paid a full programmatic re-sign-in on EVERY call, on every engine — and on
 * WebKit that pointless second `page.goto` raced the sign-in's own navigation
 * and failed the spec outright with "interrupted by another navigation".
 */
function hijackedBySignIn(page: Page, res: Response | null): boolean {
  if (page.url().includes('/sign-in')) return true
  for (let req: Request | null = res?.request() ?? null; req; req = req.redirectedFrom()) {
    if (req.url().includes('/sign-in')) return true
  }
  return false
}

type GetOpts = Parameters<APIRequestContext['get']>[1]
type PostOpts = Parameters<APIRequestContext['post']>[1]
type PutOpts = Parameters<APIRequestContext['put']>[1]
type PatchOpts = Parameters<APIRequestContext['patch']>[1]
type DeleteOpts = Parameters<APIRequestContext['delete']>[1]

/**
 * Authenticated requests against the test's own `page`. Use these instead of
 * `page.request.*` so every call refreshes the Clerk session first and can't
 * silently 307 to sign-in mid-spec.
 */
export const api = {
  get: (page: Page, url: string, opts?: GetOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.get(url, opts)),
  post: (page: Page, url: string, opts?: PostOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.post(url, opts)),
  put: (page: Page, url: string, opts?: PutOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.put(url, opts)),
  patch: (page: Page, url: string, opts?: PatchOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.patch(url, opts)),
  delete: (page: Page, url: string, opts?: DeleteOpts): Promise<APIResponse> =>
    refreshed(page, url, () => page.request.delete(url, opts)),
}

/**
 * Run a seed/cleanup routine with a FRESH authenticated page. `beforeAll`/`afterAll`
 * have no `page` fixture, and a raw `request.newContext({ storageState })` carries a
 * frozen Clerk token that 307-redirects to /sign-in once its short (~60s) TTL lapses —
 * the seed then parses an HTML sign-in page as JSON and throws
 * `Unexpected token '<'`. This opens a real page (so clerk-js can mint a fresh token),
 * navigates to the role's landing surface, hands the page to `fn` (use `api.*` on it,
 * which re-refreshes before every call), and always tears the context down.
 *
 * Seeders written against a request context (`ctx.get/post/...`) port over by taking
 * a `page` and swapping `ctx.` for `api.`(page, ...)`.
 */
export async function withSeedPage<T>(
  browser: Browser,
  role: Role,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext({ storageState: STORAGE[role], baseURL: BASE_URL })
  const page = await context.newPage()
  PAGE_ROLE.set(page, role) // so session recovery re-signs-in with the right account
  try {
    await page.goto(LANDING[role])
    return await fn(page)
  } finally {
    await context.close()
  }
}


/**
 * The quiz/explain/synthesis routes all enforce the shared 'ai' rate-limit
 * tier (12 requests / 60s per user — see lib/rate-limit.ts). Several specs'
 * own call volume can legitimately outrun that budget, so every action that
 * can 429 under a spec's own load is retried, waiting exactly the route's
 * own `Retry-After` (seconds) before trying again — the SAME real rate
 * limiter, never bypassed, mocked, or waited-around with a blind guess.
 * `tag` prefixes the console.log line so retries are traceable to the spec
 * that triggered them.
 */
export async function withRateLimitRetry<T>(
  action: () => Promise<{ status: number; retryAfterSeconds: number; result: T }>,
  tag: string,
): Promise<T> {
  for (;;) {
    const { status, retryAfterSeconds, result } = await action()
    if (status !== 429) return result
    const waitMs = Math.max(1000, retryAfterSeconds * 1000) + 250
    // eslint-disable-next-line no-console
    console.log(`[${tag}] hit the ai-tier rate limit; waiting ${waitMs}ms before retrying…`)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
}

/**
 * Open one gateway building from `/lab` and wait for its panel.
 *
 * A REAL pointer click, deliberately. The lab is an isometric grid where a
 * 128px sprite's silhouette can cover a neighbour's centre — in the DEFAULT
 * gateway cells the Operations Hub sits over Discovery's, and Playwright
 * (which clicks centres) reports "subtree intercepts pointer events" and never
 * gets in. The fix is the LAYOUT, not the click: `seed-e2e.mjs` seeds an
 * explicit spread for the shared fixture and `e2e/lab.ts` now seeds the same
 * one for every disposable lab. Clicking for real is what keeps that honest —
 * a `dispatchEvent` would sail through a layout no student could use.
 */
export async function openGateway(page: Page, label: string): Promise<void> {
  await page.goto('/lab')
  await page.getByRole('button', { name: `Open ${label}` }).click({ timeout: 10_000 })
  await expect(page.getByRole('dialog', { name: label })).toBeVisible({ timeout: 10_000 })
}

/** Open the Literature Review feature panel from /lab. */
export function openLiteratureReview(page: Page): Promise<void> {
  return openGateway(page, 'Literature Review')
}

// Smallest valid PNG (1×1, transparent). sharp decodes it, so the attachment
// upload route accepts it as a real image.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Upload a real (tiny) image via the project-log attachment route and return its
 * view URL. Use this instead of fabricating an attachment URL: a log POST now
 * requires each referenced attachment to be a genuine upload (team-prefixed object
 * key + a `temporary` UploadedAsset ledger row), so a made-up URL is rejected 400/409.
 */
export async function uploadLogAttachment(page: Page): Promise<string> {
  const res = await api.post(page, '/api/project-log/attachment', {
    multipart: { file: { name: 'e2e-seed.png', mimeType: 'image/png', buffer: TINY_PNG } },
  })
  if (!res.ok()) {
    throw new Error(`Attachment upload failed while seeding: ${res.status()} ${await res.text()}`)
  }
  const { url } = (await res.json()) as { url: string }
  return url
}
