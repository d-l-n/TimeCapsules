import { test, expect } from '@playwright/test'
import { login, waitForLoadComplete } from './helpers'

test.describe('Groups', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('groups page loads with create and join inputs', async ({ page }) => {
    await page.goto('/groups')
    await waitForLoadComplete(page)
    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible()
    await expect(page.getByPlaceholder(/code/i).first()).toBeVisible()
  })

  test('allows creating a group', async ({ page }) => {
    await page.goto('/groups')
    await waitForLoadComplete(page)
    const nameInput = page.getByPlaceholder(/name/i).first()
    await nameInput.fill(`Test Group ${Date.now()}`)
    await page.getByLabel(/create/i).first().click()
    await expect(page.getByText(/created/i).first()).toBeVisible({ timeout: 15000 })
  })
})
