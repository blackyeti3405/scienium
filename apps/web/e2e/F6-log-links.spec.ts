import { test, expect } from './test'
import { type Page } from '@playwright/test'
import { api, withSeedPage, uploadLogAttachment, gotoFresh } from './api'
import { createLab, type OwnedLab } from './lab'

/**
 * F6 — Project-Log log↔log linking (activates `ProjectLogReference`).
 * One test per acceptance criterion (10 criteria total, from
 * .claude/pipeline/plan-F6.md). Runs as the default `chromium` project
 * (authenticated lab leader / devuser1) — v1 links progress↔progress
 * entries only, all on the single Operations Hub → Project Log surface.
 *
 * Criterion → test mapping:
 *  AC1  — A progress entry card shows "+ Link entry" once there are ≥2 entries
 *  AC2  — Opening the picker lists OTHER entries by number/stage; current entry absent
 *  AC3  — Selecting an entry adds a chip to "Linked entries" without a full reload
 *  AC4  — Reloading the tab still shows the chip on the source entry (DB-persisted)
 *  AC5  — The target entry's card shows a "Referenced by" chip pointing back (post-reload)
 *  AC6  — Clicking the chip's X removes it immediately, and it stays gone after reload
 *  AC7  — Re-opening the picker no longer lists an already-linked entry (no duplicate link)
 *  AC8  — The picker never offers the current entry as an option to link to itself
 *  AC9  — Deleting a referenced entry succeeds; the referencing entry's log view still
 *         loads without a 500 and without a ghost chip (delete-cascade fix)
 *  AC10 — An entry with no links renders neither a "Linked entries" nor "Referenced by" row
 *
 * Seeding strategy:
 * - beforeAll creates three fresh progress log entries (uniquely tagged bodies) via
 *   POST /api/project-log: entryA, entryB, entryC. Two are enough to unlock the
 *   "+ Link entry" affordance (entries.length > 1); a third is reserved for the
 *   AC9 delete-cascade check so AC1–AC8's link (A -> B) is undisturbed by it.
 * - Tests run in serial: AC3 creates the A -> B link that AC4-AC7 depend on; AC6
 *   removes it again before AC7 re-checks the picker; AC9 links A -> C then
 *   deletes C to exercise the cascade fix.
 * - afterAll removes any remaining references touching the seeded entries, then
 *   deletes entryA/entryB/entryC (in that order — DELETE handles cascade itself,
 *   but we also clear before-hand defensively) so the leader team's Project Log
 *   returns to its pre-test state.
 */

const RUN_ID = Date.now().toString(36)

const BODY_A = `[E2E-F6-${RUN_ID}] Entry A — set up the spectrophotometer calibration curve.`
const BODY_B = `[E2E-F6-${RUN_ID}] Entry B — ran trial 3 of the absorbance measurements.`
const BODY_C = `[E2E-F6-${RUN_ID}] Entry C — disposable entry for the delete-cascade check.`
const NEXT_STEPS = `[E2E-F6-${RUN_ID}] Clean up after the test.`
const STAGE = 'Data Collection'

interface SeededEntry {
  id: string
  entryNumber: number
}

let lab: OwnedLab

/** Seeded entry ids (set in beforeAll, read across tests). */
let entryA: SeededEntry | null = null
let entryB: SeededEntry | null = null
let entryC: SeededEntry | null = null

/** Create one progress log entry via the API, tagged with a unique body. Returns id + entryNumber. */
async function seedEntry(page: Page, body: string): Promise<SeededEntry> {
  // Discover currentUserId first — multi-member teams require attendeeIds.
  const getRes = await api.get(page, '/api/project-log')
  if (!getRes.ok()) {
    throw new Error(`GET /api/project-log failed while seeding: ${getRes.status()} ${await getRes.text()}`)
  }
  const { currentUserId } = await getRes.json()

  // A log requires ≥1 attachment; upload a real one so it passes the attachment
  // validation (team-prefixed key + ledger row) instead of a fabricated URL.
  const attachmentUrl = await uploadLogAttachment(page)

  const postRes = await api.post(page, '/api/project-log', {
    data: {
      body,
      nextSteps: NEXT_STEPS,
      stage: STAGE,
      attendeeIds: currentUserId ? [currentUserId] : [],
      attachmentUrls: [attachmentUrl],
    },
  })
  if (!postRes.ok()) {
    throw new Error(`Seed project-log entry failed: ${postRes.status()} ${await postRes.text()}`)
  }
  const { entry } = await postRes.json()
  return { id: entry.id, entryNumber: entry.entryNumber }
}

/**
 * Open the Operations Hub feature panel from /lab and switch to the Project
 * Log tab. Does NOT wait on the tab's `GET /api/project-log` response here:
 * React Strict Mode (on by default in `next dev`) double-invokes the tab's
 * mount effect, so this fetch is issued twice per open, and the two responses
 * can resolve minutes apart under variable dev-DB latency in either order —
 * `waitForResponse` on the first one to land is not a reliable "the DOM is
 * now correct" signal (confirmed by tracing: two GETs resolving ~3.4s apart on
 * one open, and a subsequent open's pair not resolving at all inside 30s under
 * load). The reliable check is the DOM itself: every caller below asserts on
 * `cardFor(...)` — a locator scoped under the same auto-retrying `expect` —
 * with a generous timeout, which keeps polling the real render regardless of
 * how many duplicate fetches are in flight or in what order they land.
 */
async function openProjectLog(page: Page) {
  await gotoFresh(page, '/lab')
  await page.getByRole('button', { name: 'Open Operations Hub' }).waitFor({ state: 'attached' })
  // JS click bypasses the isometric z-index overlap that blocks Playwright's
  // coordinate-based pointer events (same workaround as F2/F3 specs).
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLButtonElement>('button[aria-label="Open Operations Hub"]')
    if (!btn) throw new Error('Operations Hub building button not found')
    btn.click()
  })
  await expect(page.getByRole('dialog', { name: 'Operations Hub' })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Project Log' }).click()
}

/** Generous, auto-retrying timeout for DOM assertions that depend on the
 * Project Log tab's own fetch completing — absorbs both the Strict-Mode
 * double-fetch and remote-dev-DB latency spikes without weakening what's
 * asserted (same end state, just a wider polling window). */
const PROJECT_LOG_LOAD_TIMEOUT = 30_000

/** Locator for the entry card whose body text contains the given unique marker. */
function cardFor(page: Page, bodyMarker: string) {
  return page.locator('.ops-log-entry__card').filter({ hasText: bodyMarker })
}

test.describe('F6 — Project-Log log↔log linking', () => {
  // Order-dependent (order comes from fullyParallel:false — see playwright.config.ts): all tests share the
  // same three seeded entries and mutate their references, so the
  // add/remove/reload assertions run against each other's results.

  // ── Seed / teardown ───────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    // Created BEFORE any browser work: it repoints the leader's `activeTeamId`,
    // so every seeded entry below belongs to this file's own lab.
    lab = await createLab('log-links')
    await withSeedPage(browser, 'leader', async (page) => {
      entryA = await seedEntry(page, BODY_A)
      entryB = await seedEntry(page, BODY_B)
      entryC = await seedEntry(page, BODY_C)
    })
  })

  test.afterAll(async () => {
    // Entries, their cross-references and the whole reference graph go with the
    // lab. This replaces a cleanup that had to unlink A→B and A→C by hand,
    // DELETE three entries while tolerating a 404 for the one AC9 already
    // removed, and then re-GET the log to VERIFY none survived — every step of
    // which existed only because the entries lived in a lab shared with the
    // next spec.
    await lab.dispose()
  })

  // ── AC1 ───────────────────────────────────────────────────────────────────────
  test('AC1: "+ Link entry" button is visible on an entry card once there are ≥2 entries', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set — beforeAll failed')
    await openProjectLog(page)

    const cardA = cardFor(page, BODY_A)
    await expect(cardA).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await expect(cardA.getByTestId('link-entry-open')).toBeVisible()
  })

  // ── AC2 ───────────────────────────────────────────────────────────────────────
  test('AC2: opening the picker lists OTHER entries by number/stage; current entry absent', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set')
    const [a, b] = [entryA, entryB]
    await openProjectLog(page)

    const cardA = cardFor(page, BODY_A)
    await expect(cardA.getByTestId('link-entry-open')).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await cardA.getByTestId('link-entry-open').click()
    await expect(cardA.getByTestId('link-entry-picker')).toBeVisible()

    const select = cardA.getByTestId('link-entry-select')
    const optionValues = await select.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    )
    // Entry B (the OTHER entry) must be offered.
    expect(optionValues).toContain(b.id)
    // Entry A (the CURRENT entry) must never be offered.
    expect(optionValues).not.toContain(a.id)

    const optionLabels = await select.locator('option').allTextContents()
    expect(optionLabels.some((t) => t.includes(`#${b.entryNumber}`) && t.includes(STAGE))).toBe(true)
  })

  // ── AC3 ───────────────────────────────────────────────────────────────────────
  test('AC3: selecting an entry adds a chip to "Linked entries" without a full page reload', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set')
    await openProjectLog(page)

    const urlBefore = page.url()
    const cardA = cardFor(page, BODY_A)
    await expect(cardA.getByTestId('link-entry-open')).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await cardA.getByTestId('link-entry-open').click()
    await cardA.getByTestId('link-entry-select').selectOption(entryB.id)

    // Wait on the POST response itself (generous window for remote-dev-DB
    // latency) so the DOM assertion below isn't racing the network — once the
    // response has landed, the state update is synchronous and a normal
    // timeout is enough.
    const respPromise = page.waitForResponse(
      (r) => r.url().includes('/references') && r.request().method() === 'POST',
      { timeout: 30_000 },
    )
    await cardA.getByTestId('link-entry-submit').click()
    const resp = await respPromise
    expect(resp.ok()).toBe(true)

    const linksRow = cardA.getByTestId('log-links')
    await expect(linksRow).toBeVisible()
    const chip = linksRow.getByTestId('log-links-chip')
    await expect(chip).toHaveCount(1)
    await expect(chip).toHaveAttribute('data-entry-number', String(entryB.entryNumber))
    await expect(chip).toContainText(`#${entryB.entryNumber}`)
    await expect(chip).toContainText(STAGE)

    // No full reload occurred — same page origin+pathname (client-side state update).
    expect(new URL(page.url()).pathname).toBe(new URL(urlBefore).pathname)
  })

  // ── AC4 ───────────────────────────────────────────────────────────────────────
  test('AC4: reloading the Project Log tab still shows the chip on the source entry (persisted)', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set')
    // Re-navigate through the full flow (a fresh /lab load, not page.reload(),
    // since the feature lives inside a dynamically-mounted overlay panel).
    await openProjectLog(page)

    const cardA = cardFor(page, BODY_A)
    const chip = cardA.getByTestId('log-links').getByTestId('log-links-chip')
    await expect(chip).toHaveCount(1, { timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await expect(chip).toHaveAttribute('data-entry-number', String(entryB.entryNumber))
  })

  // ── AC5 ───────────────────────────────────────────────────────────────────────
  test('AC5: the target entry\'s card shows a "Referenced by" chip pointing back (post-reload)', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set')
    await openProjectLog(page)

    const cardB = cardFor(page, BODY_B)
    const backlinksRow = cardB.getByTestId('log-backlinks')
    await expect(backlinksRow).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    const chip = backlinksRow.getByTestId('log-backlinks-chip')
    await expect(chip).toHaveCount(1)
    await expect(chip).toHaveAttribute('data-entry-number', String(entryA.entryNumber))
    await expect(chip).toContainText(`#${entryA.entryNumber}`)
    // Incoming chips are read-only — no remove control inside them.
    await expect(chip.getByTestId('log-links-remove')).toHaveCount(0)
  })

  // ── AC6 ───────────────────────────────────────────────────────────────────────
  test('AC6: clicking the chip\'s X removes it immediately, and it stays gone after reload', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set')
    await openProjectLog(page)

    const cardA = cardFor(page, BODY_A)
    const linksRow = cardA.getByTestId('log-links')
    await expect(linksRow.getByTestId('log-links-chip')).toHaveCount(1, { timeout: PROJECT_LOG_LOAD_TIMEOUT })

    // Wait on the DELETE response itself (generous window for remote-dev-DB
    // latency) rather than racing the DOM-visibility timeout against the
    // network — the state update is synchronous once the response lands, so
    // the DOM assertion below runs with a normal timeout after we already
    // know the round trip completed successfully.
    const respPromise = page.waitForResponse(
      (r) => r.url().includes('/references') && r.request().method() === 'DELETE',
      { timeout: 30_000 },
    )
    await linksRow.getByTestId('log-links-remove').click()
    const resp = await respPromise
    expect(resp.ok()).toBe(true)

    // Immediate local removal — no full reload needed to see it disappear (the
    // component filters its own `entries` state as soon as the DELETE resolves,
    // it never refetches).
    await expect(linksRow).not.toBeVisible()

    // Persisted: a fresh load also shows no chip. Assert the card itself is
    // visible first (generous timeout — absorbs tab-load latency) so the
    // following "not visible" checks can't pass vacuously because the card
    // hasn't rendered yet.
    await openProjectLog(page)
    const cardAReloaded = cardFor(page, BODY_A)
    await expect(cardAReloaded).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await expect(cardAReloaded.getByTestId('log-links')).not.toBeVisible()

    // The backlink on B's side is also gone (derived server-side from the same row).
    const cardBReloaded = cardFor(page, BODY_B)
    await expect(cardBReloaded).toBeVisible()
    await expect(cardBReloaded.getByTestId('log-backlinks')).not.toBeVisible()
  })

  // ── AC7 ───────────────────────────────────────────────────────────────────────
  test('AC7: re-opening the picker after linking no longer lists the already-linked entry', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set')
    await openProjectLog(page)

    // Re-create the A -> B link (AC6 removed it) so this test can observe the
    // "already linked" exclusion from a known starting point. Wait on the POST
    // response itself so the DOM assertion below doesn't race the network.
    const cardA = cardFor(page, BODY_A)
    await expect(cardA.getByTestId('link-entry-open')).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await cardA.getByTestId('link-entry-open').click()
    await cardA.getByTestId('link-entry-select').selectOption(entryB.id)
    const respPromise = page.waitForResponse(
      (r) => r.url().includes('/references') && r.request().method() === 'POST',
      { timeout: 30_000 },
    )
    await cardA.getByTestId('link-entry-submit').click()
    const resp = await respPromise
    expect(resp.ok()).toBe(true)
    await expect(cardA.getByTestId('log-links').getByTestId('log-links-chip')).toHaveCount(1)

    // Re-open the picker: entry B must no longer be an option.
    await cardA.getByTestId('link-entry-open').click()
    const select = cardA.getByTestId('link-entry-select')
    const optionValues = await select.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    )
    expect(optionValues).not.toContain(entryB.id)

    // "Linked entries" still shows the link at most once (not duplicated).
    await expect(cardA.getByTestId('log-links').getByTestId('log-links-chip')).toHaveCount(1)
  })

  // ── AC8 ───────────────────────────────────────────────────────────────────────
  test('AC8: the "+ Link entry" picker never offers the current entry as an option', async ({
    page,
  }) => {
    if (!entryA || !entryB) throw new Error('Seeded entries not set')
    await openProjectLog(page)

    // Check on entry A (already has an outgoing link from AC7 — irrelevant here).
    const cardA = cardFor(page, BODY_A)
    await expect(cardA.getByTestId('link-entry-open')).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await cardA.getByTestId('link-entry-open').click()
    const selectA = cardA.getByTestId('link-entry-select')
    const optionValuesA = await selectA.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    )
    expect(optionValuesA).not.toContain(entryA.id)

    // Check on entry B (no outgoing links of its own) for the same guarantee.
    const cardB = cardFor(page, BODY_B)
    await cardB.getByTestId('link-entry-open').click()
    const selectB = cardB.getByTestId('link-entry-select')
    const optionValuesB = await selectB.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    )
    expect(optionValuesB).not.toContain(entryB.id)
  })

  // ── AC9 ───────────────────────────────────────────────────────────────────────
  test('AC9: deleting a referenced entry succeeds; the referencing entry\'s log view still loads (no 500, no ghost chip)', async ({
    page,
  }) => {
    if (!entryA || !entryC) throw new Error('Seeded entries not set')
    await gotoFresh(page, '/lab') // fresh session cookie before page.request calls

    // Link A -> C via the API directly (equivalent to the UI flow, faster to set up).
    const linkRes = await api.post(page, `/api/project-log/${entryA.id}/references`, {
      data: { targetId: entryC.id },
    })
    expect(linkRes.ok()).toBe(true)

    // Delete entry C (the referenced/target entry) while A still references it.
    const deleteRes = await api.delete(page, `/api/project-log/${entryC.id}`)
    expect(deleteRes.ok()).toBe(true)
    expect((await deleteRes.json()).ok).toBe(true)

    // The read path must NOT 500 — the dangling ProjectLogReference row (if the
    // cascade fix were missing) would break the join in GET /api/project-log.
    const getRes = await api.get(page, '/api/project-log')
    expect(getRes.status()).toBe(200)
    const { entries } = await getRes.json()

    // Entry C itself must be gone from the list.
    expect((entries as Array<{ id: string }>).some((e) => e.id === entryC!.id)).toBe(false)

    // Entry A must still be present, and its `links` must NOT contain a ghost
    // chip pointing at the now-deleted entry C.
    const aRow = (entries as Array<{ id: string; links: Array<{ id: string }> }>).find(
      (e) => e.id === entryA!.id,
    )
    expect(aRow).toBeTruthy()
    expect(aRow!.links.some((l) => l.id === entryC!.id)).toBe(false)

    // The UI surface also loads cleanly (no error state) after the delete.
    await openProjectLog(page)
    const cardA = cardFor(page, BODY_A)
    await expect(cardA).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    // No chip anywhere on the page points at the deleted entry's number-less
    // ghost — the most direct UI check is that entry C's body text is gone.
    await expect(page.getByText(BODY_C)).toHaveCount(0)

    // entryC is now deleted server-side; null it out so afterAll's cleanup
    // DELETE for it correctly expects (and tolerates) a 404.
    entryC = null
  })

  // ── AC10 ──────────────────────────────────────────────────────────────────────
  test('AC10: an entry with no links shows neither a "Linked entries" nor "Referenced by" row', async ({
    page,
  }) => {
    if (!entryB) throw new Error('Seeded entries not set')
    await openProjectLog(page)

    // Entry B has no OUTGOING links (it only ever received one) — its own
    // "Linked entries" row must be absent regardless of any "Referenced by"
    // state exercised by earlier tests, since that row is keyed on `links`
    // (outgoing), never `backlinks` (incoming).
    const cardB = cardFor(page, BODY_B)
    await expect(cardB).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await expect(cardB.getByTestId('log-links')).not.toBeVisible()

    // For the fully-empty case (neither row on either card), remove the sole
    // remaining A -> B link (re-created by AC7, untouched since) so B's
    // "Referenced by" row also disappears — confirming the section only
    // renders on non-empty state rather than always rendering emptily.
    const cardA = cardFor(page, BODY_A)
    const linksRow = cardA.getByTestId('log-links')
    if (await linksRow.isVisible()) {
      // Wait on the DELETE response itself so the DOM assertion doesn't race
      // the network — same pattern as AC6.
      const respPromise = page.waitForResponse(
        (r) => r.url().includes('/references') && r.request().method() === 'DELETE',
        { timeout: 30_000 },
      )
      await linksRow.getByTestId('log-links-remove').click()
      const resp = await respPromise
      expect(resp.ok()).toBe(true)
      await expect(linksRow).not.toBeVisible()
    }

    await openProjectLog(page)
    const cardBFinal = cardFor(page, BODY_B)
    await expect(cardBFinal).toBeVisible({ timeout: PROJECT_LOG_LOAD_TIMEOUT })
    await expect(cardBFinal.getByTestId('log-links')).not.toBeVisible()
    await expect(cardBFinal.getByTestId('log-backlinks')).not.toBeVisible()
  })
})
