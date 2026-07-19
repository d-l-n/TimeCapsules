import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Auth', () => {
  test('shows login page with email and google options', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('Sign in with Google')).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/password/i)).toBeVisible()
  })

  test('email login lands on dashboard', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('protected routes redirect to login when signed out', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page).toHaveURL('/login')
  })
})
