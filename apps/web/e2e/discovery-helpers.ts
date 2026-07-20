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
 * it's empty before the test proceeds. Confirmation matters here: these serial
 * tests share one team, and under this env's 4-7s Supabase latency a prior test's
 * late tree POST can otherwise land after the DELETE — leaving rows a stale hydrate
 * would load, which then de-dupes the next search-result add (no POST) and drifts
 * node-count deltas. Polling the GET until empty makes each test start clean.
 */
export async function resetTree(page: Page): Promise<void> {
  await api.delete(page, '/api/discovery/tree')
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
