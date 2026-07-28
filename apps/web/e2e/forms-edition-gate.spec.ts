import { test, expect } from '@playwright/test'
import { openGateway } from './api'
import { createLab, type OwnedLab } from './lab'

/**
 * The forms checklist's edition notice (REFACTOR2 §0.8).
 *
 * `test/forms-guidance-gate.test.ts` pins the GATE — that the route withholds
 * applicability copy unless the edition is signed, unedited and in date. It
 * cannot pin the other half: that a student actually SEES why the app is not
 * telling them which forms their project needs. This repo has no jsdom, so a
 * `.tsx` is only reachable through a browser, and the forms tab had no E2E
 * coverage at all — on a surface whose whole reason for existing is that wrong
 * guidance here can get a project disqualified.
 *
 * The lab label is deliberately free of words that appear in clickable UI text
 * (it becomes the team NAME, and `getByRole(name:)` matches substrings — see
 * `createLab`'s doc comment).
 */

let lab: OwnedLab

test.describe('Forms checklist — unreviewed edition (§0.8)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    lab = await createLab('edgate')
  })

  test.afterAll(async () => {
    await lab.dispose()
  })

  test('states that scienium does not say which forms apply, and links the official rules', async ({
    page,
  }) => {
    await openGateway(page, 'Science Fair')
    await page.getByRole('button', { name: 'Forms' }).click()

    // The official title is rendered (the catalog reaches the student) …
    await expect(page.getByText('Form 1A: Student Checklist/Research Plan')).toBeVisible({
      timeout: 15_000,
    })

    // … and the notice explains why nothing beside it says when to file it.
    const notice = page.getByTestId('forms-edition-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Check the official rules')
    await expect(notice.getByRole('link', { name: /Official rules/ })).toHaveAttribute(
      'href',
      /societyforscience\.org/,
    )
  })
})
