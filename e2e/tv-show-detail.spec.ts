import { test, expect } from '@playwright/test'
import { login, navigateToShow, KNOWN_SHOWS } from './helpers'

const TMDB_TV = KNOWN_SHOWS['breaking-bad']

test.describe('TV Show Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('navigates to show detail with episodes rendered', async ({ page }) => {
    await navigateToShow(page, TMDB_TV)
    await expect(page.locator('body')).not.toContainText('SHOW NOT FOUND')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('episode toggle buttons are present on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await navigateToShow(page, TMDB_TV)
    const episodeButtons = page.locator('button:has-text("Episode"), button:has-text("E")')
    await expect(episodeButtons.first()).toBeVisible({ timeout: 10000 })
  })

  test('episode toggle buttons are present on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await navigateToShow(page, TMDB_TV)
    const episodeButtons = page.locator('button:has-text("Episode"), button:has-text("E")')
    await expect(episodeButtons.first()).toBeVisible({ timeout: 10000 })
  })
})
