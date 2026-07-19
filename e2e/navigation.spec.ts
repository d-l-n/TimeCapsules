import { test, expect } from '@playwright/test'
import { waitForLoadComplete, loginAsGuest } from './helpers'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page)
  })

  test('dashboard loads and shows navigation tabs', async ({ page }) => {
    await waitForLoadComplete(page)
    await expect(page.locator('header').locator('text=TIME CAPSULES').first()).toBeVisible()
  })

  test('can navigate between tabs', async ({ page }) => {
    await waitForLoadComplete(page)
    const routes = ['/dashboard', '/discover', '/calendar', '/history', '/stats']

    for (const route of routes) {
      const link = page.locator(`a[href="${route}"]`).first()
      if (await link.isVisible()) {
        await link.click()
        await page.waitForURL(`**${route}`, { timeout: 10000 })
        await expect(page).not.toHaveURL('/login')
      }
    }
  })
})
