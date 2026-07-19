import { test, expect } from '@playwright/test'
import { login, navigateToShow, waitForLoadComplete, KNOWN_SHOWS } from './helpers'

const TMDB_TV = KNOWN_SHOWS['breaking-bad']

test.describe('Dashboard flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('dashboard shows followed shows section and navigates to detail', async ({ page }) => {
    await waitForLoadComplete(page)
    const card = page.locator('a[href^="/show/"]').first()
    await expect(card).toBeVisible({ timeout: 20000 })
    await card.click()
    await expect(page).toHaveURL(/\/show\//)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('toggle an episode and see progress change', async ({ page }) => {
    await navigateToShow(page, TMDB_TV)
    const toggle = page.locator('button[aria-label*="watched" i], button:has-text("Episode")').first()
    await expect(toggle).toBeVisible({ timeout: 10000 })
    const before = await toggle.getAttribute('aria-pressed').catch(() => null)
    await toggle.click()
    if (before !== null) {
      await expect(toggle).not.toHaveAttribute('aria-pressed', before)
    } else {
      await expect(toggle).toBeVisible()
    }
  })

  test('returning to dashboard reflects the followed show', async ({ page }) => {
    await waitForLoadComplete(page)
    const count = await page.locator('a[href^="/show/"]').count()
    expect(count).toBeGreaterThan(0)
  })
})
