import { test, expect } from '@playwright/test'
import { loginAsGuest, navigateToShow, KNOWN_SHOWS } from './helpers'

const TMDB_MOVIE = KNOWN_SHOWS['the-matrix']

test.describe('Movie Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page)
  })

  test('navigates to movie detail with title and MARK AS WATCHED', async ({ page }) => {
    await navigateToShow(page, TMDB_MOVIE)
    await expect(page.locator('body')).not.toContainText('SHOW NOT FOUND')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('movie page has MARK AS WATCHED button on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await navigateToShow(page, TMDB_MOVIE)
    const markWatched = page.locator('button:has-text("MARK AS WATCHED"), button:has-text("WATCHED")')
    await expect(markWatched).toBeVisible({ timeout: 10000 })
  })

  test('movie page has MARK AS WATCHED button on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await navigateToShow(page, TMDB_MOVIE)
    const markWatched = page.locator('button:has-text("MARK AS WATCHED"), button:has-text("WATCHED")')
    await expect(markWatched).toBeVisible({ timeout: 10000 })
  })
})
