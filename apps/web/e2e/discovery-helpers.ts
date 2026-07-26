import { expect, type Page } from '@playwright/test'
import { api } from './api'

/** Dismiss the Discovery home screen ("Continue/Start Exploring") to reach the
 *  main explorer. The home screen (`showHome`) resets to true on every fresh mount,
 *  so this must run after each page.goto AND after each page.reload() before the
 *  Papers toggle (which only exists in the explorer view) is reachable. */
export async function dismissHome(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Continue Exploring|Start Exploring/ }).click()
}

/** Navigate to /discovery and dismiss the home screen ("Continue/Start Exploring"). */
export async function openDiscovery(page: Page): Promise<void> {
  await page.goto('/discovery')
  await dismissHome(page)
}

/**
 * Reset this team's discovery tree to a known-empty state via the API, and CONFIRM
 * it's empty before the test proceeds.
 *
 * ## This helper was silently doing nothing
 *
 * v0.38.0 (REFACTOR2 P1-R1) made `DELETE /api/discovery/tree` two-phase: the
 * first call returns **409 with a single-use `proposalToken`** bound to the exact
 * node ids, and only a second call carrying that token deletes anything. This
 * helper ignored the response entirely and went straight to polling — so from
 * v0.38.0 onward it deleted NOTHING, the poll burned its full 15 seconds, and
 * three specs failed for a reason that looked like latency. Their `mode: 'serial'`
 * files then reported the rest of their tests as "did not run".
 *
 * The response status is now asserted at every step. A reset that cannot reset
 * must say so immediately, not time out looking like a slow database.
 */
export async function resetTree(page: Page): Promise<void> {
  const first = await api.delete(page, '/api/discovery/tree')

  if (first.status() === 409) {
    // Phase 1 handed back a proposal for the nodes that exist right now.
    const { proposalToken } = (await first.json()) as { proposalToken?: string }
    expect(proposalToken, 'tree reset returned 409 with no proposalToken').toBeTruthy()
    const confirmed = await api.delete(
      page,
      `/api/discovery/tree?token=${encodeURIComponent(proposalToken!)}`,
    )
    expect(
      confirmed.ok(),
      `tree reset confirmation failed: ${confirmed.status()} ${await confirmed.text()}`,
    ).toBe(true)
  } else {
    // 200 with `removedCount: 0` is the documented no-op for an empty tree.
    expect(first.ok(), `tree reset failed: ${first.status()} ${await first.text()}`).toBe(true)
  }

  // Still polled, for the reason the original comment gives: a prior test's late
  // tree POST can land after the DELETE, and a stale hydrate would then de-dupe
  // the next add and drift the node-count deltas.
  await expect
    .poll(() => treeNodeCount(page), { timeout: 15000, intervals: [200, 400, 800] })
    .toBe(0)
}

/**
 * Node count from the tree GET, or -1 if the response isn't the expected JSON
 * (e.g. an auth redirect to an HTML sign-in page before the page has navigated).
 * Returning -1 keeps a poll retrying instead of throwing on non-JSON bodies.
 */
export async function treeNodeCount(page: Page): Promise<number> {
  try {
    const res = await api.get(page, '/api/discovery/tree')
    if (!res.ok()) return -1
    if (!(res.headers()['content-type'] ?? '').includes('application/json')) return -1
    const body = await res.json()
    return Array.isArray(body.nodes) ? body.nodes.length : -1
  } catch {
    return -1
  }
}

/** True when the tree GET (as JSON) contains a node with the given externalId; false on non-JSON/miss. */
export async function treeHasExternalId(page: Page, externalId: string): Promise<boolean> {
  try {
    const res = await api.get(page, '/api/discovery/tree')
    if (!res.ok()) return false
    if (!(res.headers()['content-type'] ?? '').includes('application/json')) return false
    const body = await res.json()
    return (
      Array.isArray(body.nodes) &&
      body.nodes.some((n: { externalId?: string }) => n.externalId === externalId)
    )
  } catch {
    return false
  }
}
