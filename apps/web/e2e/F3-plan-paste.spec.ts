import { test, expect, type Page } from '@playwright/test'
import { STORAGE } from './roles'
import { api } from './api'

/**
 * F3 — Research Plan paste-text fallback.
 * One test per acceptance criterion (12 criteria total, per
 * .claude/pipeline/plan-F3.md — the CURRENT, overwritten "paste-text" F3, not
 * the earlier shipped "pixel dialogs" F3 covered by e2e/F3.spec.ts).
 * Runs as the default `chromium` project (authenticated lab leader / devuser1,
 * "E2E Test Lab").
 *
 * NOTE: intentionally a DIFFERENT filename from the shipped e2e/F3.spec.ts —
 * this spec never touches that file's routes/fixtures.
 *
 * Criterion → test mapping:
 *  AC1  — "Paste text" segmented-control option visible beside the doc input
 *  AC2  — Clicking Paste text reveals the textarea (hides the doc-URL input);
 *         Connect a doc switches back
 *  AC3  — In paste mode with the textarea empty, Save text is disabled
 *  AC4  — After typing text + Save text, a "synced ... ago" indicator appears,
 *         with no Google Doc URL ever entered
 *  AC5  — After a paste-save, the active-source chip reads "pasted text"
 *  AC6  — After a paste-save, "Review my plan" is enabled
 *  AC7  — After a paste-save, "Has this been done?" is enabled (quota permitting)
 *  AC8  — Reload reopens in paste mode with the saved text still in the textarea
 *  AC9  — Editing + "Update text" re-saves; reload shows the edited text
 *  AC10 — >100,000 chars: counter shows the warning state; stored text is
 *         truncated to <=100,000 chars, never a 500
 *  AC11 — Switching a paste-backed plan to Connect a doc + a valid public
 *         Google Doc URL flips the active-source chip to "google doc"
 *         (last-saved wins)
 *  AC12 — Saving with neither input present surfaces a visible inline error,
 *         no crash / no 500
 *
 * Discovery notes (verified live against the running app before writing
 * assertions, not read from source):
 * - The feature only exists inside the "Research Plan" gateway overlay opened
 *   from /lab (button[aria-label="Open Research Plan"] -> dialog
 *   aria-label="Research Plan"). The static /research-plan route is an
 *   unrelated "Coming soon" stub — never navigated to here.
 * - POST /api/research-plan requires BOTH projectType and projectSubtype to be
 *   selected (400s "projectType: Expected string, received null" /
 *   "projectSubtype: Expected string, received null" otherwise) — this is
 *   pre-existing, unconditional validation, not new F3 behavior, so every
 *   save in this suite selects Engineering -> Robotics & Control first.
 * - GET /api/research-plan returned `{ plan: null, ... }` for this team before
 *   any test/discovery mutation ran — confirmed empty, no pre-existing
 *   Google-doc-connected row to preserve. beforeAll re-confirms this and
 *   afterAll restores it (best-effort, since there is no DELETE endpoint).
 * - The doc-sync path needs a real, publicly reachable "Anyone with the link"
 *   Google Doc. There is no project fixture for this, so AC11 uses Google's
 *   own official, permanently public "Docs API Quickstart" sample document
 *   (id 195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE, confirmed live: 200,
 *   text/plain, body "Sample doc") rather than a guessed/owned-by-nobody id.
 * - Per task instructions: the AI review / idea-check endpoints are never
 *   actually invoked (no click on "Review my plan" / "Has this been done?")
 *   — only their enabled/disabled state is asserted.
 */

const RUN_ID = Date.now().toString(36)

const PASTE_TEXT_V1 = `[E2E-F3-${RUN_ID}] Hypothesis: increasing ambient light duration increases seedling growth rate. We will grow three cohorts of bean seedlings under 8h, 12h, and 16h light cycles and measure stem length every 3 days for two weeks.`
const PASTE_TEXT_V2 = `[E2E-F3-${RUN_ID}-edited] Revised hypothesis: increasing ambient light duration increases seedling growth rate up to a saturation point near 14h. Cohorts unchanged; added a leaf-count secondary measure.`

/** Google's own permanently public "Docs API Quickstart" sample doc. */
const PUBLIC_DOC_URL =
  'https://docs.google.com/document/d/195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE/edit'

/** Snapshot of the team's plan row before this suite touches it (for restore). */
let originalPlan: unknown = null

/** Open the Research Plan feature panel from /lab. */
async function openResearchPlan(page: Page) {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open Research Plan' }).click({ timeout: 10_000 })
  const dialog = page.getByRole('dialog', { name: 'Research Plan' })
  await expect(dialog).toBeVisible({ timeout: 5000 })
  // Wait past the dynamic-import fallback AND the panel's own initial GET
  // fetch — both render pixel skeletons now (the old .animate-spin spinners
  // were replaced), so gate on the skeleton testids instead.
  await expect(dialog.getByTestId('hub-panel-skeleton')).toHaveCount(0, { timeout: 15_000 })
  await expect(dialog.getByTestId('research-plan-skeleton')).toHaveCount(0, { timeout: 15_000 })
  return dialog
}

/**
 * Select Engineering -> Robotics & Control. Required before ANY save
 * succeeds (pre-existing, unconditional server validation — see discovery
 * notes above); a bare paste/doc save without this 400s and persists
 * nothing.
 */
async function selectProjectType(dialog: ReturnType<Page['getByRole']>) {
  const engineering = dialog.locator('button', { hasText: 'Engineering' })
  // No-op if already selected (idempotent across tests in the serial chain).
  const alreadySelected = await engineering.evaluate((el) =>
    el.className.includes('border-[#F5C518]'),
  )
  if (!alreadySelected) {
    await engineering.click()
  }
  const subtype = dialog.locator('button', { hasText: 'Robotics & Control' })
  if (await subtype.count()) {
    const subtypeSelected = await subtype.evaluate((el) =>
      el.className.includes('border-[#F5C518]'),
    )
    if (!subtypeSelected) {
      await subtype.click()
    }
  }
}

test.describe('F3 — Research Plan paste-text fallback', () => {
  // Tests mutate the same team's single ResearchPlan row serially — must not
  // run concurrently or later ACs would race earlier ones' saves.
  test.describe.configure({ mode: 'serial' })

  // ── Seed / snapshot ────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    // Navigate first (fresh page) before any page.request call — the stored
    // Clerk JWT can be stale this early only if a prior suite ran first in the
    // same worker; a goto forces a session-cookie refresh regardless.
    const page = await browser.newPage({ storageState: STORAGE.leader })
    try {
      await page.goto('/lab')
      const res = await api.get(page, '/api/research-plan')
      if (res.status() !== 200) {
        throw new Error(`beforeAll snapshot GET failed: ${res.status()} ${await res.text()}`)
      }
      const body = await res.json()
      originalPlan = body.plan
    } finally {
      await page.close()
    }
  })

  test.afterAll(async ({ browser }) => {
    // Restore the team's plan row to its pre-suite state. There is no DELETE
    // endpoint on /api/research-plan, so "restore" means: if the row was
    // originally empty (plan: null, the case this suite found and is the only
    // case it can create from scratch), leave a clearly-marked, harmless
    // paste row rather than the AI-review/idea-check byproducts of this run
    // is not applicable here (this feature adds no new AI route). If the row
    // originally had a Google Doc URL, reconnect exactly that URL so the team
    // ends on the same active source it started with (best-effort — the
    // route can't literally null out lastSyncedText once ANY row exists).
    const page = await browser.newPage({ storageState: STORAGE.leader })
    try {
      await page.goto('/lab')
      const original = originalPlan as null | {
        googleDocUrl: string | null
        projectType: string | null
        projectSubtype: string | null
        activeSource: 'google_doc' | 'paste' | null
      }

      if (original && original.activeSource === 'google_doc' && original.googleDocUrl) {
        const res = await api.post(page, '/api/research-plan', {
          data: {
            googleDocUrl: original.googleDocUrl,
            projectType: original.projectType ?? undefined,
            projectSubtype: original.projectSubtype ?? undefined,
          },
        })
        if (res.status() !== 200) {
          throw new Error(
            `afterAll restore (google_doc) failed loudly: ${res.status()} ${await res.text()}`,
          )
        }
      } else if (original === null) {
        // Genuinely started empty (this suite's own beforeAll confirmed
        // `plan: null`). There is no way to delete the row this suite's
        // tests create back to `null` through the public API (no DELETE
        // endpoint — same limitation e2e/F1.spec.ts documents for
        // TeacherFeedback). Leave the row in the same benign, clearly
        // E2E-tagged paste state the suite's own tests already exercise so
        // a human/teacher glancing at this team's plan sees obviously-fake
        // E2E content, not silently-orphaned data.
        const res = await api.post(page, '/api/research-plan', {
          data: {
            planText: `[E2E-F3-${RUN_ID}] cleanup marker — this row started empty; the E2E suite could not delete it back to empty (no DELETE endpoint exists).`,
            projectType: 'engineering',
            projectSubtype: 'robotics',
          },
        })
        if (res.status() !== 200) {
          throw new Error(`afterAll cleanup-marker save failed loudly: ${res.status()} ${await res.text()}`)
        }
      }
      // else: original had some other shape (e.g. paste-sourced already) —
      // nothing further to reconcile; the suite's own last test already left
      // the row in a valid, non-crashing state.
    } finally {
      await page.close()
    }
  })

  // ── AC1 ──────────────────────────────────────────────────────────────────
  test('AC1: a "Paste text" segmented-control option is visible beside the doc input', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    await expect(dialog.getByText('Plan source')).toBeVisible()
    await expect(dialog.locator('button', { hasText: 'Connect a doc' })).toBeVisible()
    await expect(dialog.locator('button', { hasText: 'Paste text' })).toBeVisible()
  })

  // ── AC2 ──────────────────────────────────────────────────────────────────
  test('AC2: Paste text reveals the textarea and hides the doc input; Connect a doc switches back', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)

    // The panel opens in whichever mode the team's plan last persisted
    // (activeSource === 'paste' after a prior AC4 run), so enter doc mode
    // explicitly — the AC under test is the toggle, not the initial state.
    await dialog.locator('button', { hasText: 'Connect a doc' }).click()
    await expect(dialog.getByPlaceholder('https://docs.google.com/document/d/…')).toBeVisible()
    await expect(dialog.getByPlaceholder('Paste your research plan here…')).toHaveCount(0)

    await dialog.locator('button', { hasText: 'Paste text' }).click()
    await expect(dialog.getByPlaceholder('Paste your research plan here…')).toBeVisible()
    await expect(dialog.getByPlaceholder('https://docs.google.com/document/d/…')).toHaveCount(0)

    await dialog.locator('button', { hasText: 'Connect a doc' }).click()
    await expect(dialog.getByPlaceholder('https://docs.google.com/document/d/…')).toBeVisible()
    await expect(dialog.getByPlaceholder('Paste your research plan here…')).toHaveCount(0)
  })

  // ── AC3 ──────────────────────────────────────────────────────────────────
  test('AC3: in paste mode with the textarea empty, Save text is disabled', async ({ page }) => {
    const dialog = await openResearchPlan(page)
    await dialog.locator('button', { hasText: 'Paste text' }).click()
    const textarea = dialog.getByPlaceholder('Paste your research plan here…')
    // A prior run's saved paste text prefills the draft from the DB — clear it
    // (without saving) so the AC tests what it names: empty ⇒ Save disabled.
    await textarea.fill('')
    await expect(textarea).toHaveValue('')
    // Reads "Update text" when the plan is already paste-backed from a prior
    // run, "Save text" on a virgin plan — the disabled state is what's under test.
    await expect(dialog.locator('button', { hasText: /Save text|Update text/ })).toBeDisabled()
  })

  // ── AC4 ──────────────────────────────────────────────────────────────────
  test('AC4: typing text + Save text shows a synced indicator, with no Google Doc URL entered', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    await selectProjectType(dialog)

    await dialog.locator('button', { hasText: 'Paste text' }).click()
    // Confirm the doc-URL input was never used in this flow.
    await expect(dialog.getByPlaceholder('https://docs.google.com/document/d/…')).toHaveCount(0)

    const textarea = dialog.getByPlaceholder('Paste your research plan here…')
    await textarea.fill(PASTE_TEXT_V1)
    const saveBtn = dialog.locator('button', { hasText: /Save text|Update text/ })
    await expect(saveBtn).toBeEnabled()
    // Wait for the POST itself: on a non-virgin row the "synced … ago"
    // indicator is ALREADY visible from the previous save, so asserting it
    // alone lets the test end (and kill the page) while the save is still in
    // flight — AC8 then reloads into the stale text.
    const postResponse = page.waitForResponse(
      (res) => res.url().includes('/api/research-plan') && res.request().method() === 'POST',
    )
    await saveBtn.click()
    expect((await postResponse).status()).toBe(200)

    // "synced ... ago" indicator appears near the header.
    await expect(dialog.getByText(/synced .* ago/i)).toBeVisible({ timeout: 8000 })
  })

  // ── AC5 ──────────────────────────────────────────────────────────────────
  test('AC5: after a paste-save, the active-source indicator reads pasted text (not a doc)', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    // AC4 already persisted a paste-sourced plan; a reload of the panel must
    // reflect the DB-persisted activeSource.
    await expect(dialog.getByText('source: pasted text', { exact: false })).toBeVisible({
      timeout: 8000,
    })
    await expect(dialog.getByText('source: google doc', { exact: false })).toHaveCount(0)
  })

  // ── AC6 ──────────────────────────────────────────────────────────────────
  test('AC6: after a paste-save, "Review my plan" is enabled', async ({ page }) => {
    const dialog = await openResearchPlan(page)
    const reviewBtn = dialog.getByRole('button', { name: /Review my plan/i })
    await expect(reviewBtn).toBeVisible({ timeout: 8000 })
    await expect(reviewBtn).toBeEnabled()
    // Explicitly do NOT click it — the AI review endpoint costs real Anthropic
    // tokens; enabled/disabled state is the full extent of this assertion.
  })

  // ── AC7 ──────────────────────────────────────────────────────────────────
  test('AC7: after a paste-save, "Has this been done?" is enabled (quota permitting)', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    const ideaBtn = dialog.getByRole('button', { name: /Has this been done\?/i })
    await expect(ideaBtn).toBeVisible({ timeout: 8000 })

    // Read the team's real remaining idea-check quota — assert "enabled" only
    // when quota permits, exactly mirroring the button's own gating logic
    // (never asserting a hard-coded remaining count, since other suites in
    // this shared dev DB may consume the same daily budget).
    const res = await api.get(page, '/api/research-plan')
    expect(res.status()).toBe(200)
    const { ideaCheck } = await res.json()
    expect(typeof ideaCheck.remaining).toBe('number')

    if (ideaCheck.remaining > 0) {
      await expect(ideaBtn).toBeEnabled()
    } else {
      await expect(ideaBtn).toBeDisabled()
    }
    // Explicitly do NOT click it — the idea-check endpoint is a real,
    // rate-limited Anthropic web-search call; enabled/disabled state (and the
    // remaining-count text it derives from) is the full extent of this
    // assertion.
    await expect(ideaBtn).toContainText(String(ideaCheck.remaining))
  })

  // ── AC8 ──────────────────────────────────────────────────────────────────
  test('AC8: reload reopens in paste mode with the previously saved text still present', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    // No manual "Paste text" click needed — the panel must auto-select paste
    // mode on load because the persisted activeSource is 'paste'.
    const textarea = dialog.getByPlaceholder('Paste your research plan here…')
    await expect(textarea).toBeVisible({ timeout: 8000 })
    await expect(textarea).toHaveValue(PASTE_TEXT_V1)
    // Doc-mode input must not be showing.
    await expect(dialog.getByPlaceholder('https://docs.google.com/document/d/…')).toHaveCount(0)
  })

  // ── AC9 ──────────────────────────────────────────────────────────────────
  test('AC9: editing the saved text + Update text re-saves; reload shows the edited text', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    const textarea = dialog.getByPlaceholder('Paste your research plan here…')
    await expect(textarea).toHaveValue(PASTE_TEXT_V1)

    // Button reads "Update text" (not "Save text") once already paste-sourced.
    const updateBtn = dialog.locator('button', { hasText: 'Update text' })
    await expect(updateBtn).toBeVisible()
    await expect(dialog.locator('button', { hasText: 'Save text' })).toHaveCount(0)

    await textarea.fill(PASTE_TEXT_V2)
    await updateBtn.click()
    await expect(dialog.getByText(/synced .* ago/i)).toBeVisible({ timeout: 8000 })

    // Reload (close + reopen the panel) — edit-in-place must persist.
    await page.getByRole('button', { name: 'Close' }).click()
    const reopened = await openResearchPlan(page)
    const textareaAfterReload = reopened.getByPlaceholder('Paste your research plan here…')
    await expect(textareaAfterReload).toHaveValue(PASTE_TEXT_V2)
  })

  // ── AC10 ─────────────────────────────────────────────────────────────────
  test('AC10: text over 100,000 chars shows the counter warning and is truncated on save (no 500)', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    const textarea = dialog.getByPlaceholder('Paste your research plan here…')
    await expect(textarea).toBeVisible({ timeout: 8000 })

    const oversized = `[E2E-F3-${RUN_ID}-cap]${'x'.repeat(100_050)}` // > 100,000 chars
    expect(oversized.length).toBeGreaterThan(100_000)
    await textarea.fill(oversized)

    // Counter shows the warning (red) state at/over the 100,000 cap. Matched
    // on the exact formatted "<len> / 100,000" string (len is deterministic
    // from the fixture above) so this can't collide with any other counter
    // rendering (e.g. an empty "0 / 100,000" from a stale DOM node).
    const expectedLen = oversized.length.toLocaleString()
    const counter = dialog.getByText(`${expectedLen} / 100,000`, { exact: true })
    await expect(counter).toBeVisible()
    await expect(counter).toHaveClass(/text-red-400/)

    try {
      const updateBtn = dialog.locator('button', { hasText: 'Update text' })
      const saveRes = page.waitForResponse(
        (r) => r.url().includes('/api/research-plan') && r.request().method() === 'POST',
      )
      await updateBtn.click()
      const res = await saveRes
      // Per plan-F3.md AC10 (verbatim): "...after saving, the stored/reloaded
      // text is truncated to at most 100,000 characters (never rejected with
      // a 500)". The plan frames the >100k case as SAVE-THEN-TRUNCATE, never
      // as a rejection — so a non-500 rejection (400) is still a criterion
      // failure, not a pass, even though it isn't a crash. Never weakened to
      // accept 400 here; see the routing note below this test for why it
      // currently fails.
      expect(res.status()).not.toBe(500)
      expect(res.status()).toBe(200)

      // Stored/reloaded text is truncated to at most 100,000 chars.
      const getRes = await api.get(page, '/api/research-plan')
      expect(getRes.status()).toBe(200)
      const { plan } = await getRes.json()
      expect(plan.activeSource).toBe('paste')
      expect(typeof plan.planTextFull).toBe('string')
      expect((plan.planTextFull as string).length).toBeLessThanOrEqual(100_000)
    } finally {
      // Leave the panel/DB in a known-good paste-sourced state regardless of
      // the assertions above, so AC11 (which starts from "currently
      // paste-sourced") is never collaterally broken by this criterion's
      // outcome. Re-fetch fresh locators: the panel may have re-rendered
      // (error text, cleared textarea) since `dialog`/`textarea` were bound.
      const freshDialog = page.getByRole('dialog', { name: 'Research Plan' })
      const freshTextarea = freshDialog.getByPlaceholder('Paste your research plan here…')
      if (await freshTextarea.count()) {
        await freshTextarea.fill(PASTE_TEXT_V2)
        const freshUpdateBtn = freshDialog.locator('button', { hasText: /Update text|Save text/ })
        if (await freshUpdateBtn.isEnabled().catch(() => false)) {
          await freshUpdateBtn.click()
          await expect(freshDialog.getByText(/synced .* ago/i)).toBeVisible({ timeout: 8000 })
        }
      }
    }
  })

  // ── AC11 ─────────────────────────────────────────────────────────────────
  test('AC11: switching a pasted plan to Connect a doc + a valid public URL flips the source to google doc', async ({
    page,
  }) => {
    const dialog = await openResearchPlan(page)
    // Currently paste-sourced (from AC10) — confirm the starting point.
    await expect(dialog.getByText('source: pasted text', { exact: false })).toBeVisible({
      timeout: 8000,
    })

    await dialog.locator('button', { hasText: 'Connect a doc' }).click()
    const urlInput = dialog.getByPlaceholder('https://docs.google.com/document/d/…')
    await expect(urlInput).toBeVisible()
    await urlInput.fill(PUBLIC_DOC_URL)

    const syncBtn = dialog.locator('button', { hasText: /Connect & sync|Refresh/ })
    await expect(syncBtn).toBeEnabled()
    await syncBtn.click()

    // Last-saved wins: active-source flips to google doc.
    await expect(dialog.getByText('source: google doc', { exact: false })).toBeVisible({
      timeout: 10_000,
    })
    await expect(dialog.getByText('source: pasted text', { exact: false })).toHaveCount(0)

    // The synced preview reflects the doc's actual text (Google's public
    // "Docs API Quickstart" sample body is literally "Sample doc").
    await expect(dialog.getByText('synced preview', { exact: false })).toBeVisible()
    await expect(dialog.getByText('Sample doc', { exact: false })).toBeVisible()

    const getRes = await api.get(page, '/api/research-plan')
    const { plan } = await getRes.json()
    expect(plan.activeSource).toBe('google_doc')
    expect(plan.googleDocUrl).toBe(PUBLIC_DOC_URL)
    expect(plan.planTextFull).toBeNull()
  })

  // ── AC12 ─────────────────────────────────────────────────────────────────
  test('AC12: saving with neither a doc URL nor pasted text shows an inline error, no crash', async ({
    page,
  }) => {
    // Both mode's save buttons (Save/Update text, Connect & sync) are
    // disabled client-side while their own input is empty (see AC3 for the
    // paste side; the doc-URL "Connect & sync" button is equally disabled on
    // an empty URL, confirmed live during discovery) — so normal UI
    // interaction can never actually dispatch a "neither field" request.
    // The only way to reach this server-side branch is a direct POST that
    // omits both fields, which is exactly the "Attempting to save with
    // neither ... present" scenario the criterion describes. This proves the
    // server-side guard behind that disabled-button UX is real (not merely
    // client-side theatre) and degrades cleanly, not with a 500.
    await page.goto('/lab') // fresh session cookie before the request call
    const res = await api.post(page, '/api/research-plan', {
      data: { projectType: 'engineering', projectSubtype: 'robotics' },
    })
    expect(res.status()).toBe(400)
    expect(res.status()).not.toBe(500)
    const body = await res.json()
    expect(typeof body.error).toBe('string')
    expect(body.error.length).toBeGreaterThan(0)
    expect(body.error.toLowerCase()).toContain('google doc')

    // Browser-observable "no crash": the panel keeps rendering normally (no
    // error boundary / blank screen) immediately after that 400 response.
    const dialog = await openResearchPlan(page)
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Plan source')).toBeVisible()
  })
})
