/**
 * E2E tests for Building Upgrades via Lab Credits (feature ID: upgrades).
 *
 * Acceptance criteria map:
 *  AC1  — first log of the real day grants the team +1 LC (DB-verified; the lab
 *          StatusStrip is SSR-seeded, not live-polled for log-earned LC).
 *  AC2  — second log the same day does NOT change the LC balance.
 *  AC3  — LC grant is team-scoped (tested via DB-level isolation guarantee in
 *          the upgrade route; asserting cross-team is a unit concern — the route
 *          uses requireTeamContext which scopes every query to ctx.teamId).
 *  AC4  — picking up a placed economy building in arrange mode shows an Upgrade
 *          affordance next to Sell, labelled "Upgrade to L2 · 1 LC".
 *  AC5  — clicking Upgrade on a L1 building: level becomes 2, LC drops by 1,
 *          toast "Upgraded … to L2" appears — all without a reload.
 *  AC6  — after reload the upgraded level persists; re-pick shows L3 cost.
 *  AC7  — at level ≥ 4 the img src ends with _t2.png; below it does not.
 *          (Covered by manifest unit test for path resolution; E2E verifies the
 *          Upgrade label progression to L5 at level 4, as _t2 art is placeholder.)
 *  AC8  — at level 15 shows "Max level" non-interactive state; POST /upgrade → 409.
 *  AC9  — POST /upgrade with insufficient LC → 402 "Not enough Lab Credits."
 *  AC10 — gateways offer neither Upgrade nor Sell.
 *  AC11 — upgradeCost unit tests (in economy.test.ts; referenced here for completeness).
 *  AC12 — activity feed records a building_upgraded entry after successful upgrade.
 *
 * ISOLATION NOTE: upgrade tests use "Robotics Bay" (key: robotics_bay) placed at
 * cell (-3,3) — far from placement.spec.ts which uses "3D Printing Shop" at (3,3).
 * This prevents collisions when files run in parallel under E2E_WORKERS=2.
 *
 * SERIALISATION NOTE: The entire file is wrapped in a single describe with
 * mode:'serial'. This prevents the two sub-describes (seeded-LC upgrades and
 * LC-earning) from running concurrently, which would let one block's beforeAll/
 * afterAll corrupt the other's LC balance.
 *
 * DB seed: LC is set to 30 for the leader team in beforeAll (so upgrade assertions
 * work deterministically without relying on the daily-earning path). The afterAll
 * resets LC to 0 and cleans up the test-created rows so reruns are clean.
 *
 * LC EARNING (AC1/AC2) is tested via a dedicated sub-describe that seeds LC=0,
 * then drives POST /api/failure-log via the authenticated fetch() in the page
 * context to stay deterministic without depending on the full failure-log UI.
 */

import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'child_process'

// ─── Constants ────────────────────────────────────────────────────────────────

// The dedicated E2E Test Lab (devuser2 leads it) — NOT the user's real DevLab.
// All seed/reset DB ops below target this throwaway team only.
const TEAM_ID = 'e2e_test_lab_01'

// Isometric grid constants — must match lib/plot.ts.
const STEP_X = 68
const STEP_Y = 34
const CLUSTER_Y = -12

// The building used for upgrade tests. Uses robotics_bay so it never collides
// with placement.spec.ts which uses printing_shop at cell (3,3).
const UPGRADE_BUILDING_KEY = 'robotics_bay'
const UPGRADE_BUILDING_NAME = 'Robotics Bay'

// Drop cell for the upgrade test building: (-3, 3).
// pixel delta from viewport centre: dx = (-3 - 3)*STEP_X = -408, dy = (-3 + 3)*STEP_Y = 0
const DROP_GX = -3
const DROP_GY = 3

// ─── DB helpers (execSync — synchronous, fine in beforeAll/afterAll) ──────────

function dbExec(sql: string) {
  execSync(`docker exec infra-postgres-1 psql -U postgres -d scienium -c "${sql}"`, {
    stdio: 'pipe',
  })
}

function seedLC(lc: number) {
  dbExec(`UPDATE team_currency SET lc=${lc} WHERE team_id='${TEAM_ID}';`)
}

function resetLC() {
  dbExec(`UPDATE team_currency SET lc=0 WHERE team_id='${TEAM_ID}';`)
}

function deleteTestBuilding() {
  dbExec(
    `DELETE FROM team_shop_buildings WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
  )
}

function deleteLabCreditClaimsToday() {
  // Remove any claims created today so reruns get a fresh daily cap.
  const today = new Date()
  const dayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`
  dbExec(`DELETE FROM lab_credit_claims WHERE team_id='${TEAM_ID}' AND day='${dayStr}';`)
}

// ─── All upgrades tests wrapped in a single serial describe ──────────────────
// mode:'serial' here prevents the two sub-describes (seeded-LC upgrades and
// LC-earning) from interleaving when fullyParallel:true is set in the config.

test.describe('upgrades feature', () => {
  test.describe.configure({ mode: 'serial' })

  // ─── Upgrade flow tests (seeded LC) ────────────────────────────────────────
  // These tests use "Robotics Bay" (robotics_bay) placed at cell (-3,3) so they
  // never collide with placement.spec.ts (printing_shop at cell (3,3)) when both
  // files run in parallel.

  test.describe('upgrade flow (seeded LC)', () => {
    test.beforeAll(() => {
      // Delete any stale robotics_bay row first so reruns start clean, then seed LC.
      deleteTestBuilding()
      deleteLabCreditClaimsToday()
      seedLC(30)
    })

    test.afterAll(() => {
      // Clean up: remove the test building and reset LC to 0.
      deleteTestBuilding()
      deleteLabCreditClaimsToday()
      resetLC()
    })

    // Helper: place the Robotics Bay on the plot via the shop UI (used in AC4/AC5/AC6).
    // After this helper the building is on the plot at cell (DROP_GX, DROP_GY).
    async function placeRoboticsBay(page: Page) {
      await page.goto('/lab')
      await page.getByRole('button', { name: 'Open buildings shop' }).click()
      const card = page
        .locator('.shop-card')
        .filter({ has: page.getByText(UPGRADE_BUILDING_NAME, { exact: true }) })
      await card.locator('.shop-card__buy').click() // shop closes, ghost attaches

      const box = (await page.locator('.lab-scene__viewport').boundingBox())!
      const centerX = box.x + box.width / 2
      const centerY = box.y + box.height / 2 + CLUSTER_Y
      const dropX = centerX + (DROP_GX - DROP_GY) * STEP_X
      const dropY = centerY + (DROP_GX + DROP_GY) * STEP_Y
      await page.mouse.move(dropX, dropY)
      await page.mouse.click(dropX, dropY)

      await expect(page.getByRole('button', { name: UPGRADE_BUILDING_NAME })).toBeVisible()
    }

    // Open a placed economy building's Sell/Upgrade menu via a REGULAR-mode click
    // (not arrange). JS .click() bypasses isometric z-order overlap.
    async function openBuildingMenu(page: Page) {
      await page
        .getByRole('button', { name: UPGRADE_BUILDING_NAME })
        .evaluate((el) => (el as HTMLButtonElement).click())
      await expect(page.locator('.plot-menu')).toBeVisible()
    }

    // AC4: regular-clicking a placed economy building opens its Sell + Upgrade menu.
    test('AC4 — clicking a placed building opens its Sell + Upgrade menu labelled with next level and LC cost', async ({
      page,
    }) => {
      // Place the Robotics Bay first (fresh start — beforeAll deleted any stale row).
      await placeRoboticsBay(page)

      await openBuildingMenu(page)
      await expect(page.locator('.plot-menu__sell')).toBeVisible()
      const upgradeBtn = page.locator('.plot-menu__upgrade')
      await expect(upgradeBtn).toBeVisible()
      await expect(upgradeBtn).toContainText('Upgrade to L2')
      // →2 is a non-tier upgrade: KP only, no LC.
      await expect(upgradeBtn).toContainText('KP')
      await expect(upgradeBtn).not.toContainText('LC')

      // Close the menu.
      await page.keyboard.press('Escape')
      await expect(page.locator('.plot-menu')).toHaveCount(0)
    })

    // AC10: gateways open their feature on regular click (no Sell/Upgrade menu) and
    //       cannot be deleted in arrange mode.
    test('AC10 — a gateway opens its feature (no menu) and shows no Delete in arrange', async ({ page }) => {
      await page.goto('/lab')

      // Regular click on a gateway opens its feature panel — NOT the building menu.
      await page
        .getByRole('button', { name: 'Open Operations Hub' })
        .evaluate((el) => (el as HTMLButtonElement).click())
      await expect(page.locator('.plot-menu')).toHaveCount(0)

      // Arrange mode: picking up a gateway shows no Delete affordance.
      await page.reload()
      await page.getByRole('button', { name: 'Arrange buildings' }).click()
      await page
        .getByRole('button', { name: 'Move Operations Hub' })
        .evaluate((el) => (el as HTMLButtonElement).click())
      await expect(page.locator('.plot-delete')).toHaveCount(0)
      await page.keyboard.press('Escape')
    })

    // Read a StatusStrip currency value ("KP" or "LC") as a number.
    async function readStat(page: Page, label: 'KP' | 'LC') {
      const stat = page.locator('.status-strip__stat').filter({ hasText: label })
      const txt = await stat.locator('.status-strip__stat-value').textContent()
      return parseInt((txt ?? '0').replace(/,/g, ''), 10)
    }

    // AC5: a non-tier upgrade (L1→L2) charges KP only, bumps the level, toasts, and
    //      leaves the menu open showing the next level — without a reload.
    test('AC5 — Upgrade on L1 building: level 2, KP drops, LC unchanged, toast', async ({ page }) => {
      // Ensure a clean L1 building with known funds.
      dbExec(
        `UPDATE team_shop_buildings SET level=1 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )
      seedLC(30)
      await page.goto('/lab')

      const kp0 = await readStat(page, 'KP')
      const lc0 = await readStat(page, 'LC')

      await openBuildingMenu(page)
      await page.locator('.plot-menu__upgrade').click()

      await expect(page.getByText(new RegExp(`Upgraded ${UPGRADE_BUILDING_NAME} to L2`))).toBeVisible()
      // Menu stays open, now offers L3.
      await expect(page.locator('.plot-menu__upgrade')).toContainText('Upgrade to L3')

      // KP dropped (non-tier upgrade), LC unchanged — live, no reload.
      expect(await readStat(page, 'KP')).toBeLessThan(kp0)
      expect(await readStat(page, 'LC')).toBe(lc0)
    })

    // AC6: after reload the upgraded level persists; the menu shows the next level.
    test('AC6 — after reload, upgraded level persists; menu shows next level cost', async ({
      page,
    }) => {
      await page.goto('/lab')

      await openBuildingMenu(page)
      const upgradeBtn = page.locator('.plot-menu__upgrade')
      await expect(upgradeBtn).toContainText('Upgrade to L3')
      await expect(upgradeBtn).toContainText('KP')

      await page.keyboard.press('Escape')
    })

    // A TIER upgrade (→4) charges LC in addition to KP.
    test('a tier upgrade (→L4) charges LC as well as KP', async ({ page }) => {
      dbExec(
        `UPDATE team_shop_buildings SET level=3 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )
      seedLC(30)
      await page.goto('/lab')

      const lc0 = await readStat(page, 'LC')
      await openBuildingMenu(page)
      const upgradeBtn = page.locator('.plot-menu__upgrade')
      await expect(upgradeBtn).toContainText('Upgrade to L4')
      await expect(upgradeBtn).toContainText('LC') // tier transition charges LC
      await upgradeBtn.click()
      await expect(page.getByText(new RegExp(`Upgraded ${UPGRADE_BUILDING_NAME} to L4`))).toBeVisible()
      // upgradeLcCost(4) = 2.
      expect(await readStat(page, 'LC')).toBe(lc0 - 2)
    })

    // The ARRANGE-mode Delete action removes a placed economy building (90% refund).
    test('Arrange mode Delete removes a placed economy building', async ({ page }) => {
      await page.goto('/lab')

      await page.getByRole('button', { name: 'Arrange buildings' }).click()
      await page
        .getByRole('button', { name: `Move ${UPGRADE_BUILDING_NAME}` })
        .evaluate((el) => (el as HTMLButtonElement).click())

      // In arrange mode the only action is Delete — no Upgrade.
      const del = page.locator('.plot-delete')
      await expect(del).toBeVisible()
      await expect(page.locator('.plot-menu__upgrade')).toHaveCount(0)

      await del.click()
      await expect(page.getByText(new RegExp(`Sold ${UPGRADE_BUILDING_NAME}`))).toBeVisible()
      await expect(page.getByRole('button', { name: UPGRADE_BUILDING_NAME })).toHaveCount(0)

      // Re-place it so later tests (AC9/AC12/AC8/AC7) still have the building.
      await page.getByRole('button', { name: 'Done arranging' }).click()
      await placeRoboticsBay(page)
    })

    // AC9: a TIER upgrade with insufficient LC returns 402 (LC only gates tier-ups).
    // Use the TOP tier (14→15 needs 10 LC) with LC drained to 0, so a stray +LC grant
    // from a parallel spec sharing this test team can't push LC over the threshold.
    test('AC9 — tier upgrade returns 402 when LC is insufficient', async ({ page }) => {
      dbExec(
        `UPDATE team_shop_buildings SET level=14 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )
      dbExec(`UPDATE team_currency SET lc=0 WHERE team_id='${TEAM_ID}';`)

      await page.goto('/lab')

      // Try to upgrade via API directly (authenticated page context).
      const response = await page.evaluate(async (key: string) => {
        const res = await fetch('/api/buildings/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        })
        return { status: res.status, body: await res.json() }
      }, UPGRADE_BUILDING_KEY)

      expect(response.status).toBe(402)
      expect(response.body.error).toContain('Not enough Lab Credits')

      // Restore for remaining tests: level back to 2, LC topped up.
      dbExec(
        `UPDATE team_shop_buildings SET level=2 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )
      seedLC(30)
    })

    // AC12: the activity feed records a building_upgraded entry after upgrade.
    test('AC12 — activity feed records building_upgraded entry after successful upgrade', async ({
      page,
    }) => {
      await page.goto('/lab')

      // Open the building menu and upgrade (building is below max at this point).
      await openBuildingMenu(page)
      await page.locator('.plot-menu__upgrade').click()
      await expect(page.getByText(new RegExp(`Upgraded ${UPGRADE_BUILDING_NAME} to L`))).toBeVisible()
      await page.keyboard.press('Escape')

      // Open the activity panel.
      await page.getByRole('button', { name: 'Open team activity' }).click()
      await expect(page.locator('.activity-panel')).toBeVisible()

      // The activity feed should contain an entry about upgrading to a level.
      await expect(
        page
          .locator('.activity-panel__desc')
          .filter({ hasText: new RegExp(`upgraded ${UPGRADE_BUILDING_NAME} to level`, 'i') })
          .first(),
      ).toBeVisible()

      // Close the panel.
      await page.getByRole('button', { name: 'Close activity' }).click()
    })

    // AC8: at level 15, shows "Max level" non-interactive state.
    //      POST /api/buildings/upgrade for it returns 409.
    test('AC8 — level-15 building shows Max level state; upgrade route returns 409', async ({
      page,
    }) => {
      // Set the building to max level via DB.
      dbExec(
        `UPDATE team_shop_buildings SET level=15 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )

      await page.goto('/lab')

      // Open the building menu.
      await openBuildingMenu(page)

      // Should show "Max level" span (not a button).
      const maxSpan = page.locator('.plot-menu__upgrade--max')
      await expect(maxSpan).toBeVisible()
      await expect(maxSpan).toContainText('Max level')
      // It should not be a button.
      expect(await maxSpan.evaluate((el) => el.tagName)).toBe('SPAN')

      // Close.
      await page.keyboard.press('Escape')

      // POST /upgrade should return 409.
      const response = await page.evaluate(async (key: string) => {
        const res = await fetch('/api/buildings/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        })
        return { status: res.status, body: await res.json() }
      }, UPGRADE_BUILDING_KEY)
      expect(response.status).toBe(409)
      expect(response.body.error).toContain('already at max level')

      // Reset building level back to 2 for any remaining tests.
      dbExec(
        `UPDATE team_shop_buildings SET level=2 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )
    })

    // AC7: at level >= 4, the menu's Upgrade label shows L5; manifest resolves _t2.png.
    // We verify via the Upgrade label progression (L5 at level 4 confirms level
    // is tracked); the manifest unit test covers the path resolution precisely.
    // We use seeded LC (no earning needed) — DB is set to level 4 directly.
    test('AC7 — at level>=4, menu Upgrade label shows L5; manifest resolves _t2.png path (unit test covers path)', async ({
      page,
    }) => {
      // Set building to level 4 via DB.
      dbExec(
        `UPDATE team_shop_buildings SET level=4 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )

      await page.goto('/lab')

      // Open the building menu.
      await openBuildingMenu(page)

      // At level 4, the next upgrade is to L5.
      await expect(page.locator('.plot-menu__upgrade')).toContainText('Upgrade to L5')

      // Close.
      await page.keyboard.press('Escape')

      // Reset to level 1 for a clean state.
      dbExec(
        `UPDATE team_shop_buildings SET level=1 WHERE team_id='${TEAM_ID}' AND building_key='${UPGRADE_BUILDING_KEY}';`,
      )
    })
  })

  // ─── LC earning tests (AC1 / AC2) ──────────────────────────────────────────
  // Drive POST /api/failure-log from the authenticated page context to avoid
  // needing the full UI (which requires photo uploads, stage selection, etc.).
  // The failure-log route grants +1 LC the first time per day, then caps.
  // Runs after the seeded-LC describe (enforced by the outer serial wrapper).

  test.describe('LC earning via log creation (daily cap)', () => {
    test.beforeAll(() => {
      // Start with 0 LC and no claims today so the earning path is clear.
      resetLC()
      deleteLabCreditClaimsToday()
    })

    test.afterAll(() => {
      // Clean up: remove any claims created during these tests.
      deleteLabCreditClaimsToday()
      resetLC()
    })

    // AC1: the first log of the real day grants the team exactly +1 LC. Verified at
    // the DB level (the lab StatusStrip is SSR-seeded, not live-polled for LC earned
    // in the log panel, so a DOM assertion would require a reload).
    test('AC1 — first log of the day grants the team +1 LC (DB-verified)', async ({
      page,
    }) => {
      await page.goto('/lab')

      // Read initial LC.
      const lcStat = page.locator('.status-strip__stat').filter({ hasText: 'LC' })
      await expect(lcStat).toBeVisible()
      const initialLCText = await lcStat.locator('.status-strip__stat-value').textContent()
      const initialLC = parseInt((initialLCText ?? '0').replace(/,/g, ''), 10)

      // POST a failure log via the page's authenticated fetch.
      const postResult = await page.evaluate(async () => {
        const res = await fetch('/api/failure-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ happened: 'Test failure for LC earn', learned: 'Nothing' }),
        })
        return { status: res.status, ok: res.ok }
      })
      expect(postResult.ok).toBe(true)
      expect(postResult.status).toBe(201)

      // The LC in the DB should now be initialLC + 1.
      // We verify via the DB since the StatusStrip is SSR-seeded and not live-polled.
      const lcAfterStr = execSync(
        `docker exec infra-postgres-1 psql -U postgres -d scienium -t -c "SELECT lc FROM team_currency WHERE team_id='${TEAM_ID}';"`,
      )
        .toString()
        .trim()
      const lcAfter = parseInt(lcAfterStr, 10)
      expect(lcAfter).toBe(initialLC + 1)
    })

    // AC2: a second log the same day does NOT change the LC balance.
    test('AC2 — second log the same day does not change LC balance (daily cap enforced)', async ({
      page,
    }) => {
      await page.goto('/lab')

      // Get current LC from DB (after AC1 granted 1).
      const lcBeforeStr = execSync(
        `docker exec infra-postgres-1 psql -U postgres -d scienium -t -c "SELECT lc FROM team_currency WHERE team_id='${TEAM_ID}';"`,
      )
        .toString()
        .trim()
      const lcBefore = parseInt(lcBeforeStr, 10)

      // POST a second failure log.
      const postResult = await page.evaluate(async () => {
        const res = await fetch('/api/failure-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            happened: 'Second failure — should not earn LC',
            learned: 'Still nothing',
          }),
        })
        return { status: res.status, ok: res.ok }
      })
      expect(postResult.ok).toBe(true)

      // LC should NOT have changed (daily cap).
      const lcAfterStr = execSync(
        `docker exec infra-postgres-1 psql -U postgres -d scienium -t -c "SELECT lc FROM team_currency WHERE team_id='${TEAM_ID}';"`,
      )
        .toString()
        .trim()
      const lcAfter = parseInt(lcAfterStr, 10)
      expect(lcAfter).toBe(lcBefore)
    })
  })
})
