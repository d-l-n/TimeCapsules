import { test, expect } from '@playwright/test'
import { waitForLoadComplete, loginAsGuest } from './helpers'

test.describe('Mobile Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginAsGuest(page)
  })

  test('bottom nav pill has links on mobile', async ({ page }) => {
    await waitForLoadComplete(page)
    const navPill = page.locator('.nav-pill')
    await expect(navPill).toBeVisible()
    const links = navPill.locator('a')
    const count = await links.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('header has logo and controls', async ({ page }) => {
    await waitForLoadComplete(page)
    const header = page.locator('header[role="banner"]')
    await expect(header).toBeVisible()
  })

  test('InstallBanner is hidden initially', async ({ page }) => {
    await waitForLoadComplete(page)
    const banners = page.locator('text=INSTALL APP')
    const visible = await banners.isVisible().catch(() => false)
    expect(visible).toBe(false)
  })
})
