import { test, expect } from '@playwright/test'

/**
 * Building placement (Clash-of-Clans style) on the lab plot. Exercises the parts
 * that need no KP so the test is deterministic regardless of the leader team's
 * balance: the shop's placed/buy card states, the Arrange toggle, and a real
 * gateway MOVE (free) that round-trips through POST /api/buildings/move and
 * survives a reload (DB persistence).
 */

// Isometric transform — must match lib/plot.ts.
const STEP_X = 68
const STEP_Y = 34
const CLUSTER_Y = -12

test('shop shows gateways as placed and economy buildings as placeable', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Open buildings shop' }).click()

  // The 7 gateways appear greyed-out as "Already placed".
  await expect(page.getByText('Already placed').first()).toBeVisible()
  // At least one economy building offers a Place affordance (Place button or cost).
  await expect(page.getByRole('button', { name: 'Place', exact: true }).first().or(
    page.locator('.shop-card__buy').first(),
  )).toBeVisible()
})

test('arrange mode toggles and a gateway can be moved and persists', async ({ page }) => {
  await page.goto('/lab')

  // Enter arrange mode → the edit banner appears.
  await page.getByRole('button', { name: 'Arrange buildings' }).click()
  await expect(page.getByText(/Arrange mode/)).toBeVisible()

  // Operations Hub is the front-most building (highest iso depth), so it is drawn
  // on top of its overlapping neighbours and is always clickable. Pick it up.
  const opsArrange = page.getByRole('button', { name: 'Move Operations Hub' })
  await expect(opsArrange).toBeVisible()
  await opsArrange.click()

  // Drop it on a free far-right cell (gx=3, gy=-3 → dx=+348, dy=0). Absolute
  // assertions keep the test idempotent across reruns (it persists the move).
  const viewport = page.locator('.lab-scene__viewport')
  const box = await viewport.boundingBox()
  expect(box).not.toBeNull()
  const centerX = box!.x + box!.width / 2
  const centerY = box!.y + box!.height / 2 + CLUSTER_Y
  const expectedX = centerX + (3 - -3) * STEP_X
  const expectedY = centerY + (3 + -3) * STEP_Y
  await page.mouse.click(expectedX, expectedY)

  // The hub's centre now sits on the target cell (within a small tolerance).
  const movedBtn = page.getByRole('button', { name: 'Move Operations Hub' })
  await expect(movedBtn).toBeVisible()
  const moved = await movedBtn.boundingBox()
  expect(Math.abs(moved!.x + moved!.width / 2 - expectedX)).toBeLessThan(20)

  // Persisted: after a reload (arrange mode resets) the hub is still on the cell.
  await page.reload()
  const reloaded = await page.getByRole('button', { name: 'Operations Hub' }).boundingBox()
  expect(Math.abs(reloaded!.x + reloaded!.width / 2 - expectedX)).toBeLessThan(20)
})

test('an economy building can be placed (purchased) and sold for a refund', async ({ page }) => {
  await page.goto('/lab')

  // Place the 3D Printing Shop (the user's centering example) from the shop —
  // buying happens on drop.
  await page.getByRole('button', { name: 'Open buildings shop' }).click()
  const card = page.locator('.shop-card').filter({ has: page.getByText('3D Printing Shop', { exact: true }) })
  await card.locator('.shop-card__buy').click() // shop closes, ghost attaches

  // Drop on a free front cell (gx=3, gy=3 → dx=0).
  const box = (await page.locator('.lab-scene__viewport').boundingBox())!
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2 + CLUSTER_Y
  const dropX = centerX + (3 - 3) * STEP_X
  const dropY = centerY + (3 + 3) * STEP_Y
  // Hover first so the green validity diamond shows under the ghost — confirms the
  // ghost is centred in its tile — then screenshot, then drop.
  await page.mouse.move(dropX, dropY)
  await page.screenshot({ path: 'test-results/ghost-on-grid.png' })
  await page.mouse.click(dropX, dropY)

  // It now stands on the plot.
  await expect(page.getByRole('button', { name: '3D Printing Shop' })).toBeVisible()

  // Hovering it shows the building name in the top-of-screen banner.
  await page.getByRole('button', { name: '3D Printing Shop' }).hover()
  await expect(page.locator('.plot-banner', { hasText: '3D Printing Shop' })).toBeVisible()
  await page.screenshot({ path: 'test-results/hover-name.png' })

  // Screenshot in arrange mode so the tile grid is visible — confirms the building
  // sits centred inside its diamond.
  await page.getByRole('button', { name: 'Arrange buildings' }).click()
  await page.screenshot({ path: 'test-results/placed-on-grid.png' })

  // Exit arrange mode to go back to regular mode for the new Sell UX.
  await page.getByRole('button', { name: 'Done arranging' }).click()

  // Sell via the new regular-mode menu: click the building to open .plot-menu,
  // then click .plot-menu__sell. Use JS click to bypass pointer interception from
  // overlapping isometric z-order.
  await page.getByRole('button', { name: '3D Printing Shop' }).evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.locator('.plot-menu')).toBeVisible()
  await page.locator('.plot-menu__sell').click()
  await expect(page.getByText(/Sold 3D Printing Shop for .* KP/)).toBeVisible()
  await expect(page.getByRole('button', { name: '3D Printing Shop' })).toHaveCount(0)
})
