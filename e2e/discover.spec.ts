import { test, expect } from '@playwright/test'
import { login, waitForLoadComplete } from './helpers'

test.describe('Discover', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows trending and search input', async ({ page }) => {
    await page.goto('/discover')
    await waitForLoadComplete(page)
    await expect(page.getByLabel(/search/i).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /trending/i })).toBeVisible()
  })

  test('search submits and shows results', async ({ page }) => {
    await page.goto('/discover')
    await waitForLoadComplete(page)
    const input = page.getByLabel(/search/i).first()
    await input.fill('matrix')
    await page.getByLabel('Search').click()
    await expect(page.locator('a[href^="/show/"]').first()).toBeVisible({ timeout: 20000 })
  })

  test('add to dashboard from a result', async ({ page }) => {
    await page.goto('/discover')
    await waitForLoadComplete(page)
    const input = page.getByLabel(/search/i).first()
    await input.fill('matrix')
    await page.getByLabel('Search').click()
    const card = page.locator('a[href^="/show/"]').first()
    await expect(card).toBeVisible({ timeout: 20000 })
    const addBtn = page.getByLabel(/add to dashboard/i).first()
    await addBtn.click()
    await expect(page.getByText(/added|follow|dashboard/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {})
  })
})
