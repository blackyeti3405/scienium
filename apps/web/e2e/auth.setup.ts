import { test as setup, expect } from '@playwright/test'
import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'
import fs from 'node:fs'
import { AUTH_DIR, STORAGE, getAccounts } from './roles'

/**
 * Sign in every test role ONCE and persist its Clerk session to
 * e2e/.auth/<role>.json. Specs reuse these via `storageState`, so the suite
 * authenticates a fixed number of times (once per role) no matter how many specs
 * run. The default `chromium` project uses the leader session; a spec that needs
 * another role calls `test.use({ storageState: STORAGE.teacher })`.
 *
 * We use @clerk/testing rather than driving the hosted <SignIn/> UI: it injects a
 * Clerk Testing Token (bypassing bot detection) and signs in programmatically,
 * which is the supported, non-flaky path for Clerk + Playwright.
 */
setup('authenticate all roles', async ({ browser }) => {
  // Fetch a Testing Token for the whole run (needs CLERK_SECRET_KEY in env).
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY })

  fs.mkdirSync(AUTH_DIR, { recursive: true })

  for (const acct of getAccounts()) {
    const context = await browser.newContext()
    const page = await context.newPage()

    await setupClerkTestingToken({ page })
    // Load a page that mounts ClerkProvider before signing in — not the <SignIn/>
    // route itself, which clerk.signIn cannot drive.
    await page.goto('/')
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: acct.identifier, password: acct.password },
    })

    // Confirm the session is live: a protected surface must NOT bounce to sign-in.
    await page.goto(acct.landing)
    await expect(
      page,
      `${acct.role} (${acct.identifier}) failed to authenticate — check the E2E creds and that password sign-in is enabled in Clerk`,
    ).not.toHaveURL(/\/sign-in/)

    await context.storageState({ path: STORAGE[acct.role] })
    // The session is already saved above; closing here can print a benign
    // "[Clerk Testing] FAPI request failed ... context has been closed" line as
    // clerk-js fires a background refresh mid-teardown. It does not affect the
    // saved state and is safe to ignore.
    await context.close()
  }
})
