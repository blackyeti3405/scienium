/**
 * Marketing capture: a live PvP raid, written to public/marketing/pvp.png.
 *
 * NOT a test — it asserts almost nothing and it writes into the repo. It runs
 * only when its project is explicitly enabled:
 *
 *   E2E_CAPTURE=1 pnpm --filter web exec playwright test --project=capture
 *
 * The `.capture.ts` suffix keeps it out of the chromium project, but that alone
 * never kept it out of a SUITE run: a bare `playwright test` runs every
 * configured project, so this file executed in the nightly `full` lane and in
 * `pnpm test:e2e` until the capture project was made conditional on E2E_CAPTURE.
 *
 * Why Playwright rather than driving a browser by hand: a raid lasts 15s and a
 * cast effect 900ms, while a round-trip through an interactive browser tool is
 * ~5-8s. In-process there is no round-trip, so the shot can be taken while the
 * effects are genuinely on screen.
 *
 * The effects are real — real spells, real casts against the server, real
 * sprites and radii. The only manipulation is holding each animation at its
 * peak frame (see FREEZE_FX) so the capture is deterministic instead of
 * depending on when the screenshot happens to land.
 */
import { test, expect } from '@playwright/test'
import { gotoFresh } from './api'
import {
  e2eDb,
  e2eTeamId,
  ensureSecondTeam,
  ensureSpellRecord,
  clearPvpData,
} from './db'
import { spellForBuilding } from '@/lib/pvp/spell-catalog'

const OUT = 'public/marketing/pvp.png'

/** Full volt_lab catalogue at the top sprite tier, on even cells. */
const RIVAL_BUILDINGS = [
  { buildingKey: 'mechanical_testing_rig', posX: -2, posY: -2 },
  { buildingKey: 'welding_fabrication', posX: 0, posY: -2 },
  { buildingKey: 'pcb_fab', posX: 2, posY: -2 },
  { buildingKey: 'embedded_systems_lab', posX: -2, posY: 0 },
  { buildingKey: 'ai_incubator', posX: 0, posY: 0 },
  { buildingKey: 'robotics_bay', posX: 2, posY: 0 },
  { buildingKey: 'workshop', posX: -2, posY: 2 },
  { buildingKey: 'electronics_bench', posX: 0, posY: 2 },
  { buildingKey: 'cnc_mill_shop', posX: 2, posY: 2 },
  { buildingKey: 'printing_shop', posX: 3, posY: 3 },
]

/** Gateways on ODD cells so the two sets interleave rather than collide. */
const RIVAL_GATEWAYS = [
  { gatewayKey: 'discovery', posX: -1, posY: -1 },
  { gatewayKey: 'literature_review', posX: 1, posY: -1 },
  { gatewayKey: 'research_plan', posX: -1, posY: 1 },
  { gatewayKey: 'operations_hub', posX: 1, posY: 1 },
  { gatewayKey: 'science_fair', posX: -3, posY: 1 },
  { gatewayKey: 'showcase', posX: 1, posY: 3 },
  { gatewayKey: 'pvp', posX: 3, posY: -1 },
]

/**
 * Hold every cast effect at its most photogenic frame. Peaks are read off the
 * keyframes in globals.css: blast peaks at 22% of 900ms, impact at 18% of
 * 520ms, linger at 14% of 2600ms — a negative animation-delay starts the
 * animation already that far in, and `paused` holds it there.
 *
 * CSS only. An earlier version also patched `window.setTimeout` to swallow the
 * 900ms/2600ms cull timers so the effects never unmounted; that turned out to
 * stop casts working at all, and it is unnecessary here — in-process there is
 * no round-trip, so the screenshot lands well inside the effect's own lifetime.
 */
const FREEZE_FX = `
  (() => {
    const s = document.createElement('style');
    s.textContent = \`
      .pvp-fx-blast  { animation-play-state: paused !important; animation-delay: -198ms !important; }
      .pvp-fx-impact { animation-play-state: paused !important; animation-delay: -94ms  !important; }
      .pvp-fx-linger { animation-play-state: paused !important; animation-delay: -364ms !important; }
    \`;
    document.head.appendChild(s);
  })()
`

let attackerTeamId = ''
let rivalTeamId = ''

test.beforeAll(async () => {
  attackerTeamId = await e2eTeamId()
  rivalTeamId = await ensureSecondTeam()

  // The attacker needs a spell hand worth photographing: one spell per owned
  // building, so give the E2E lab the full catalogue too.
  const owner = await e2eDb.user.findFirstOrThrow({ where: { name: 'E2E Leader' } })
  for (const b of RIVAL_BUILDINGS) {
    // Type comes from the real catalog, so the seeded Spell row matches what
    // the game would give this building rather than a guess that could drift.
    await ensureSpellRecord(b.buildingKey, spellForBuilding(b.buildingKey)?.type ?? 'applied')
    // Deliberately UNPLACED (posX/posY null). Only the DEFENDER's layout is
    // drawn in a raid; the attacker just needs to own the building for its
    // spell to appear in the hand. Placing them would collide with whatever the
    // E2E fixture already has on those cells — `(team_id, pos_x, pos_y)` is
    // unique, and Postgres allows many NULLs there.
    await e2eDb.teamShopBuilding.upsert({
      where: { teamId_buildingKey: { teamId: attackerTeamId, buildingKey: b.buildingKey } },
      update: { level: 15 },
      create: {
        teamId: attackerTeamId,
        buildingKey: b.buildingKey,
        purchasedByUserId: owner.id,
        level: 15,
      },
    })
  }

  // A defender base worth raiding: every building maxed, every gateway placed.
  //
  // Wipe first rather than upsert. `(team_id, pos_x, pos_y)` is unique, and
  // upserting BY BUILDING KEY collides the moment a different building already
  // sits on a cell this layout wants — which is exactly what the fixture's
  // pre-existing workshop did. The rival is a purpose-built PvP fixture
  // (`ensureSecondTeam`), so its base is ours to define.
  const rivalOwner = await e2eDb.teamMember.findFirstOrThrow({ where: { teamId: rivalTeamId } })
  await e2eDb.teamShopBuilding.deleteMany({ where: { teamId: rivalTeamId } })
  await e2eDb.teamGatewayPlacement.deleteMany({ where: { teamId: rivalTeamId } })
  await e2eDb.teamShopBuilding.createMany({
    data: RIVAL_BUILDINGS.map((b) => ({
      teamId: rivalTeamId,
      buildingKey: b.buildingKey,
      purchasedByUserId: rivalOwner.userId,
      posX: b.posX,
      posY: b.posY,
      level: 15,
    })),
  })
  await e2eDb.teamGatewayPlacement.createMany({
    data: RIVAL_GATEWAYS.map((g) => ({
      teamId: rivalTeamId,
      gatewayKey: g.gatewayKey,
      posX: g.posX,
      posY: g.posY,
    })),
  })

  // Start from a clean quota so the raid is never refused.
  await clearPvpData(attackerTeamId)
})

test.afterAll(async () => {
  // Leave no raid/quota rows behind; the seeded buildings are the fixture's own
  // shape and `seed:e2e` is idempotent over them.
  await clearPvpData(attackerTeamId)
  await e2eDb.$disconnect()
})

test('capture a live raid for the marketing page', async ({ page }) => {
  // Diagnostics: a cast that silently does nothing is the failure mode here, so
  // surface what the action route actually said.
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[page error]', m.text().slice(0, 200))
  })
  page.on('request', (r) => {
    if (r.method() === 'POST') console.log('[POST]', r.url().replace(/^https?:\/\/[^/]+/, ''))
  })
  page.on('response', async (r) => {
    if (r.url().includes('/api/pvp/')) {
      console.log('[pvp]', r.request().method(), r.status(), r.url().replace(/^https?:\/\/[^/]+/, ''))
    }
  })

  await gotoFresh(page, '/lab')

  await page.getByRole('button', { name: 'Open Battle Arena' }).click()
  await expect(page.getByRole('button', { name: /Raid/ })).toBeVisible({ timeout: 20_000 })

  // Arm the capture BEFORE the raid clock starts.
  await page.evaluate(FREEZE_FX)

  await page.getByRole('button', { name: /Raid/ }).first().click()
  await expect(page.getByText(/Timer:/)).toBeVisible({ timeout: 20_000 })

  // Cast a spread of spells at different parts of the base.
  //
  // Driven inside the page rather than with Playwright locators: the raid timer
  // ticks every 100ms and re-renders the board, so every building button is
  // constantly detached and normal actionability checks spend the whole raid
  // retrying. Dispatching the clicks in-page sidesteps that entirely and takes
  // about a second.
  // `force: true` is the important part. The raid timer re-renders the board
  // every 100ms, so every building button is perpetually detached and a normal
  // click spends the whole raid on actionability retries. force skips those
  // checks while still dispatching REAL browser events — which an in-page
  // `element.click()` does not do well enough for React's delegated handlers
  // here (it fired, nothing happened, no request went out).
  const targetSel = 'button[aria-label*="HP "]'
  const targetCount = await page.locator(targetSel).count()
  expect(targetCount, 'economy buildings + gateways').toBeGreaterThan(10)

  // Both selectors are aria-label based, which is stable across the constant
  // re-render. Text-based matching was not: a spell's label changes to its
  // cooldown countdown, so the filtered set shrank mid-loop and nth(i) drifted
  // onto an ALREADY-SELECTED spell — whose handler toggles selection OFF, so
  // the following target click had no spell and cast nothing.
  const spells = page.locator('button[aria-label*="damage"]')
  const spellCount = await spells.count()
  expect(spellCount, 'attacker has spells').toBeGreaterThan(0)

  for (const [i, ti] of [4, 12, 2].entries()) {
    const spell = spells.nth(i % spellCount)
    // Skip a spell that is on cooldown — it renders `disabled`, and force-
    // clicking a disabled button dispatches an event that fires no handler.
    if (await spell.isDisabled()) continue
    await spell.click({ force: true, noWaitAfter: true })
    await expect(spell, 'spell did not become selected').toHaveClass(/ring-\[#F5C518\]/, {
      timeout: 2000,
    })
    // page.mouse, not locator.click()/dispatchEvent(). The board re-renders on
    // every 100ms timer tick, so locator clicks spend the raid retrying on
    // detached nodes, and synthetic dispatch on the node never drove React's
    // handler at all. Real mouse events at a coordinate do both: no
    // actionability wait, and a genuine event React acts on.
    const box = await page.locator(targetSel).nth(ti % targetCount).boundingBox()
    if (!box) continue
    // Await the response. `handleCast` early-returns while a previous cast is
    // still in flight (`if (casting || ended) return`), so firing them back to
    // back lands exactly one and silently drops the rest.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/action'), { timeout: 6000 }),
      page.mouse.click(box.x + box.width / 2, box.y + box.height / 2),
    ])
  }

  // Shoot IMMEDIATELY: a blast lives 900ms, so anything else here costs effects.
  await page.waitForTimeout(120)
  await page.screenshot({ path: OUT })

  const fx = await page.locator('.pvp-fx-blast, .pvp-fx-impact, .pvp-fx-linger').count()
  expect(fx, 'no cast effects on the board — nothing to capture').toBeGreaterThan(0)
  console.log(`[capture] wrote ${OUT} with ${fx} effect(s) over ${targetCount} targets`)
})
