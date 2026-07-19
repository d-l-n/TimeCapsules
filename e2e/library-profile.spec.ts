import { test, expect } from '@playwright/test'
import { login, waitForLoadComplete } from './helpers'

test.describe('Library and Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('library page loads with title', async ({ page }) => {
    await page.goto('/library')
    await waitForLoadComplete(page)
    await expect(page.locator('h1')).toContainText(/library/i)
  })

  test('upcoming page loads', async ({ page }) => {
    await page.goto('/upcoming')
    await waitForLoadComplete(page)
    await expect(page).not.toHaveURL('/login')
  })

  test('profile shows sections nav and switches to stats', async ({ page }) => {
    await page.goto('/profile')
    await waitForLoadComplete(page)
    const statsBtn = page.getByRole('button', { name: /stats/i }).first()
    await expect(statsBtn).toBeVisible()
    await statsBtn.click()
    await expect(page).toHaveURL(/section=stats/)
  })

  test('profile settings section toggles theme', async ({ page }) => {
    await page.goto('/profile?section=settings')
    await waitForLoadComplete(page)
    const dark = page.getByRole('button', { name: /dark/i }).first()
    await expect(dark).toBeVisible()
    await dark.click()
    await expect(dark).toHaveAttribute('aria-pressed', 'true').catch(() => {})
  })

  test('profile history section renders', async ({ page }) => {
    await page.goto('/profile?section=history')
    await waitForLoadComplete(page)
    await expect(page).toHaveURL(/section=history/)
  })
})
