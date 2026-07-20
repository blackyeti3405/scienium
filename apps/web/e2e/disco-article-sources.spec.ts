import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'
import { api, withSeedPage } from './api'
import { dismissHome, openDiscovery, resetTree, treeHasExternalId } from './discovery-helpers'

/**
 * Feature — disco-article-sources (.claude/pipeline/plan-disco-article-sources.md).
 * A new `article` Discovery source type: two RSS/Atom-backed providers — The
 * Conversation (CC BY-ND, full in-app render + attribution, `renderMode: 'full'`)
 * and science-journalism (`renderMode: 'linkout'`, excerpt + outbound link only).
 * Runs as the default `chromium` project (authenticated lab leader), route
 * `/discovery`, `E2E_MOCK_SOURCES=1` (wired into playwright.config.ts — the
 * spawned dev server inherits it, no manual export needed).
 *
 * Mock fixtures (lib/discovery/articles.ts, MOCK branch — same for every feed of
 * a given provider, since browseFeed/resolveArticle key off provider under MOCK):
 *  - The Conversation (`renderMode: 'full'`): externalId "conversation:e2e-fixture-1",
 *    title "E2E Fixture: Why Coral Reefs Are Bleaching Faster Than Models Predicted",
 *    author "Ada Fixture", sourceName "The Conversation",
 *    html "<p>This is a deterministic E2E fixture article body. ...</p>",
 *    url "https://theconversation.com/e2e-fixture-article".
 *  - Journalism (`renderMode: 'linkout'`): externalId "rss:e2e-fixture-1",
 *    title "E2E Fixture: A Deterministic Journalism Article for Testing",
 *    author "Grace Mocker", sourceName "Quanta Magazine",
 *    excerpt "A deterministic fixture excerpt standing in for a real Quanta
 *    Magazine article.", url "https://www.quantamagazine.org/e2e-fixture-article".
 *
 * Criterion → test mapping (from the task's 5 core assertions):
 *  1. AC-Article-1 — browsing/adding a Conversation article creates an `article`
 *     node that renders the sanitized body IN-APP (ArticleReader) with visible
 *     attribution naming "The Conversation".
 *  2. AC-Article-2 — sanitization holds at the render sink: a hostile
 *     `<script>`/`onerror` payload posted through the team-scoped tree route is
 *     re-sanitized server-side (ARTICLE_SANITIZE_OPTS) and never reaches the DOM.
 *  3. AC-Article-3 — a science-journalism (link-out) item renders a card/reader
 *     with an outbound link whose href is http(s) and whose rel includes noopener.
 *  4. AC-Article-4 — the article node persists team-scoped via
 *     POST /api/discovery/tree → GET /api/discovery/tree reflects it for the
 *     owner (team-scoping/IDOR on these routes: requireTeamContext, same guard
 *     already exercised for the sibling `source` node type in papers-tab.spec.ts
 *     AC7/PM6 — not re-proven here to avoid a redundant duplicate).
 *  5. AC-Article-5 — unauthenticated requests to the new article routes
 *     (browse GET, resolve POST) 307-redirect to /sign-in (not 401), with no
 *     article data in the response body.
 */

const CONVERSATION_EXTERNAL_ID = 'conversation:e2e-fixture-1'
const CONVERSATION_TITLE = 'E2E Fixture: Why Coral Reefs Are Bleaching Faster Than Models Predicted'
const CONVERSATION_BODY_TEXT = 'This is a deterministic E2E fixture article body.'
const CONVERSATION_URL = 'https://theconversation.com/e2e-fixture-article'

const JOURNALISM_EXTERNAL_ID = 'rss:e2e-fixture-1'
const JOURNALISM_TITLE = 'E2E Fixture: A Deterministic Journalism Article for Testing'
const JOURNALISM_EXCERPT =
  'A deterministic fixture excerpt standing in for a real Quanta Magazine article.'
const JOURNALISM_URL = 'https://www.quantamagazine.org/e2e-fixture-article'

/** Switch the left pane to the Articles browse lane. */
async function openArticlesTab(page: Page) {
  await page.getByRole('button', { name: /Articles/ }).click()
}

/** Poll the tree GET until a node with the given externalId is persisted server-side. */
async function waitForArticlePersisted(page: Page, externalId: string) {
  await expect
    .poll(() => treeHasExternalId(page, externalId), { timeout: 20000, intervals: [250, 500, 1000] })
    .toBe(true)
}

test.describe('Feature — disco-article-sources (article Discovery source type)', () => {
  // Serial: every test shares the one E2E leader team's discovery tree.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // resetTree makes api.* calls, which refresh the Clerk token via the page's
    // live clerk-js — a never-navigated page has no clerk-js, so navigate first.
    await page.goto('/discovery')
    await resetTree(page)
  })

  test.afterAll(async ({ browser }) => {
    // Self-clean: leave the team's tree empty for the next run.
    await withSeedPage(browser, 'leader', async (page) => {
      await resetTree(page)
    })
  })

  // ── Criterion 1 ──────────────────────────────────────────────────────────────
  test('AC-Article-1: adding a Conversation article renders its full sanitized body in-app with visible attribution', async ({
    page,
  }) => {
    await openDiscovery(page)
    await openArticlesTab(page)

    // Mock feed card for the default (first, "the_conversation") feed loads on mount.
    const card = page.getByRole('button', { name: new RegExp(CONVERSATION_TITLE) })
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()

    await waitForArticlePersisted(page, CONVERSATION_EXTERNAL_ID)
    await page.reload()
    await dismissHome(page)

    // Full article body rendered IN-APP (ArticleReader), not just a link-out.
    await expect(page.getByText(CONVERSATION_BODY_TEXT)).toBeVisible({ timeout: 15000 })

    // Visible attribution naming the source — a CC BY-ND licensing requirement.
    await expect(page.getByText(/Ada Fixture.*The Conversation/)).toBeVisible()
    await expect(page.getByText('Republished from The Conversation under CC BY-ND')).toBeVisible()

    // Outbound attribution link — http(s), target=_blank, rel includes noopener.
    const outbound = page.getByRole('link', { name: /↗ The Conversation/ })
    await expect(outbound).toBeVisible()
    await expect(outbound).toHaveAttribute('href', CONVERSATION_URL)
    await expect(outbound).toHaveAttribute('target', '_blank')
    const rel = await outbound.getAttribute('rel')
    expect(rel).toContain('noopener')
  })

  // ── Criterion 2 ──────────────────────────────────────────────────────────────
  test('AC-Article-2: sanitization holds — a hostile <script>/on* payload never reaches the rendered DOM', async ({
    page,
  }) => {
    // Seed an article node whose html carries a hostile <script> tag and an
    // inline onerror handler, directly via the team-scoped tree POST — exercising
    // the SAME re-sanitize-on-write defense tree-service.ts applies (independent
    // of the resolve route, which already sanitizes on its own path).
    const nodeId = crypto.randomUUID()
    const externalId = 'article-e2e-hostile-1'
    const hostileHtml =
      '<p>Safe fixture paragraph.</p>' +
      '<script>window.__e2e_pwned = true;</script>' +
      '<img src="x" onerror="window.__e2e_pwned2 = true">'

    const postRes = await api.post(page, '/api/discovery/tree', {
      data: {
        nodes: [
          {
            id: nodeId,
            title: 'E2E Sanitization Fixture Article',
            parentId: null,
            source: 'article',
            externalId,
            provider: 'the_conversation',
            renderMode: 'full',
            sourceName: 'The Conversation',
            articleUrl: 'https://theconversation.com/e2e-sanitization-fixture',
            articleAuthor: 'Ada Fixture',
            excerpt: 'Sanitization fixture excerpt.',
            html: hostileHtml,
          },
        ],
      },
    })
    expect(postRes.status()).toBe(200)
    await waitForArticlePersisted(page, externalId)

    // Server-side: the stored+returned html has no <script> tag and no on* attribute.
    const treeRes = await api.get(page, '/api/discovery/tree')
    const treeJson = await treeRes.json()
    const node = treeJson.nodes.find((n: { externalId?: string }) => n.externalId === externalId)
    expect(node).toBeTruthy()
    expect(node.articleHtml).not.toContain('<script')
    expect(node.articleHtml).not.toContain('onerror')
    expect(node.articleHtml).not.toContain('__e2e_pwned')
    expect(node.articleHtml).toContain('Safe fixture paragraph.')

    // Client-side: reload, land on this node's reader (hydrate() opens the last
    // node, and it's the only one in the tree after resetTree), and assert the
    // DOM itself carries neither element.
    await page.reload()
    await dismissHome(page)

    await expect(page.getByText('Safe fixture paragraph.')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('script:has-text("__e2e_pwned")')).toHaveCount(0)
    await expect(page.locator('[onerror]')).toHaveCount(0)
    await expect(page.locator('img')).toHaveCount(0)
    const bodyText = await page.locator('.article-content').innerText()
    expect(bodyText).not.toContain('__e2e_pwned')
  })

  // ── Criterion 3 ──────────────────────────────────────────────────────────────
  test('AC-Article-3: a science-journalism (link-out) item renders an excerpt + a valid noopener outbound link, no full body', async ({
    page,
  }) => {
    await openDiscovery(page)
    await openArticlesTab(page)

    // Switch to the Quanta Magazine (journalism) feed chip.
    await page.getByRole('button', { name: 'Quanta Magazine', exact: true }).click()

    const card = page.getByRole('button', { name: new RegExp(JOURNALISM_TITLE) })
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()

    await waitForArticlePersisted(page, JOURNALISM_EXTERNAL_ID)
    await page.reload()
    await dismissHome(page)

    // Excerpt visible.
    await expect(page.getByText(JOURNALISM_EXCERPT)).toBeVisible({ timeout: 15000 })

    // Outbound "Read the full article ... ↗" link — valid http(s) href, noopener rel.
    const outbound = page.getByRole('link', { name: /Read the full article at Quanta Magazine ↗/ })
    await expect(outbound).toBeVisible()
    const href = await outbound.getAttribute('href')
    expect(href).toMatch(/^https?:\/\//)
    expect(href).toBe(JOURNALISM_URL)
    const rel = await outbound.getAttribute('rel')
    expect(rel).toContain('noopener')

    // Does NOT render a full article body — no CC BY-ND republication line, no
    // in-app article body container.
    await expect(page.getByText(/Republished from/)).toHaveCount(0)
    await expect(page.locator('.article-content')).toHaveCount(0)
  })

  // ── Criterion 4 ──────────────────────────────────────────────────────────────
  test('AC-Article-4: an article node persists team-scoped — POST /api/discovery/tree, GET reflects it for the owner', async ({
    page,
  }) => {
    await openDiscovery(page)

    const nodeId = crypto.randomUUID()
    const externalId = 'article-e2e-persist-1'
    const postRes = await api.post(page, '/api/discovery/tree', {
      data: {
        nodes: [
          {
            id: nodeId,
            title: 'E2E Persistence Fixture Article',
            parentId: null,
            source: 'article',
            externalId,
            provider: 'journalism',
            renderMode: 'linkout',
            sourceName: 'Quanta Magazine',
            articleUrl: 'https://www.quantamagazine.org/e2e-persistence-fixture',
            articleAuthor: 'Grace Mocker',
            excerpt: 'Persistence fixture excerpt.',
          },
        ],
      },
    })
    expect(postRes.status()).toBe(200)

    // GET reflects the exact node, scoped to the caller's (owner's) team — the
    // route is guarded by requireTeamContext (same team-scoping already exercised
    // for the sibling `source` node type in papers-tab.spec.ts's AC7/PM6 IDOR
    // check against the citations route, which shares the guard pattern).
    const getRes = await api.get(page, '/api/discovery/tree')
    expect(getRes.status()).toBe(200)
    const body = await getRes.json()
    const node = body.nodes.find((n: { externalId?: string }) => n.externalId === externalId)
    expect(node).toBeTruthy()
    expect(node.id).toBe(nodeId)
    expect(node.source).toBe('article')
    expect(node.sourceName).toBe('Quanta Magazine')
    expect(node.articleUrl).toBe('https://www.quantamagazine.org/e2e-persistence-fixture')

    // Reload from a fresh page load — confirms server (DB) persistence, not
    // client/localStorage state.
    await page.reload()
    await dismissHome(page)
    const getReload = await api.get(page, '/api/discovery/tree')
    const reloadBody = await getReload.json()
    expect(reloadBody.nodes.some((n: { externalId?: string }) => n.externalId === externalId)).toBe(true)
  })

  // ── Criterion 5 ──────────────────────────────────────────────────────────────
  test('AC-Article-5: unauthenticated requests to the article routes 307-redirect to /sign-in, no article data leaks', async ({
    page,
  }) => {
    // Navigate first so a live page exists for context (not strictly required for
    // an anonymous request context, but keeps this test's setup consistent).
    await page.goto('/discovery')

    const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3000}`
    // storageState MUST be explicitly cleared — newContext otherwise inherits the
    // chromium project's default storageState (the leader session).
    const anonCtx = await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: undefined })
    try {
      // GET .../articles/browse
      const browseRes = await anonCtx.get('/api/discovery/articles/browse?feed=quanta', { maxRedirects: 0 })
      expect(browseRes.status()).toBe(307)
      expect(browseRes.headers()['location']).toContain('/sign-in')
      const browseText = await browseRes.text()
      expect(browseText).not.toContain('"results"')
      expect(browseText).not.toContain('"feeds"')
      expect(browseText).not.toContain('Quanta')

      // POST .../articles/resolve
      const resolveRes = await anonCtx.post('/api/discovery/articles/resolve', {
        data: { externalId: JOURNALISM_EXTERNAL_ID, feed: 'quanta' },
        maxRedirects: 0,
      })
      expect(resolveRes.status()).toBe(307)
      expect(resolveRes.headers()['location']).toContain('/sign-in')
      const resolveText = await resolveRes.text()
      expect(resolveText).not.toContain('"html"')
      expect(resolveText).not.toContain('"excerpt"')
      expect(resolveText).not.toContain('Quanta')
    } finally {
      await anonCtx.dispose()
    }
  })

  // ── Criterion 6 — Explainers lane (MedlinePlus) ────────────────────────────
  test('AC-Article-6: the MedlinePlus explainer lane searches, badges Reference, and renders public-domain attribution (never CC BY-ND)', async ({
    page,
  }) => {
    await openDiscovery(page)
    await openArticlesTab(page)

    // The Explainers feed group renders with the Health topics lane.
    const healthChip = page.getByRole('button', { name: 'Health topics' })
    await expect(healthChip).toBeVisible({ timeout: 15000 })
    await healthChip.click()

    // Search-driven lane: empty query prompts a search…
    await expect(page.getByText(/Type a topic to search MedlinePlus/)).toBeVisible()

    // …and a query returns the deterministic fixture topics with Reference badges.
    await page.getByPlaceholder(/Search MedlinePlus health topics/).fill('diabetes')
    const fixtureCard = page.getByRole('button', { name: /E2E Fixture: Diabetes Basics/ })
    await expect(fixtureCard).toBeVisible({ timeout: 15000 })
    await expect(
      page.locator('ul li button').filter({ has: page.locator('span[data-tier="reference"]') }).first(),
    ).toBeVisible()

    // Picking it renders the full summary in-app with PUBLIC-DOMAIN attribution
    // — the CC BY-ND notice (a Conversation licensing line) must NOT appear.
    await fixtureCard.click()
    await expect(page.getByText(/what diabetes is, in plain language/)).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText('Source: MedlinePlus (NIH) — content in the public domain'),
    ).toBeVisible()
    await expect(page.getByText(/under CC BY-ND/)).toHaveCount(0)
  })

  // ── Criterion 7 — Prior-art lane (patents) ─────────────────────────────────
  test('AC-Article-7: the patents lane searches prior art and renders link-out cards, never a full body', async ({
    page,
  }) => {
    await openDiscovery(page)
    await openArticlesTab(page)

    const patentsChip = page.getByRole('button', { name: 'Prior art (patents)' })
    await expect(patentsChip).toBeVisible({ timeout: 15000 })
    await patentsChip.click()

    // Search-driven empty state prompts for an invention description.
    await expect(page.getByText(/Describe your invention idea/)).toBeVisible()

    // A query returns the deterministic patent fixtures as LINK-OUT cards.
    await page.getByPlaceholder(/Search patents for prior art/).fill('growth chamber')
    const fixtureCard = page.getByRole('button', { name: /E2E Fixture: Adjustable Plant Growth Chamber/ })
    await expect(fixtureCard).toBeVisible({ timeout: 15000 })
    await expect(fixtureCard).toContainText('link-out')

    // Picking it adds a link-out node: excerpt + outbound Google Patents link,
    // no in-app body (patent text is never rendered).
    await fixtureCard.click()
    const outbound = page.getByRole('link', { name: /↗ Google Patents/ })
    await expect(outbound).toBeVisible({ timeout: 15000 })
    await expect(outbound).toHaveAttribute('href', 'https://patents.google.com/patent/US0000001A1')
    await expect(outbound).toHaveAttribute('target', '_blank')
    const rel = await outbound.getAttribute('rel')
    expect(rel).toContain('noopener')
  })
})
