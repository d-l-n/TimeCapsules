import { test, expect } from '@playwright/test'
import { login, navigateToShow, KNOWN_SHOWS } from './helpers'

const TMDB_TV = KNOWN_SHOWS['breaking-bad']
const TMDB_MOVIE = KNOWN_SHOWS['the-matrix']

/**
 * Measures the bounding box height of each badge element and asserts
 * all are within a tolerance range of each other (no badge is more than
 * a few pixels taller/shorter than the others).
 */
async function assertBadgeHeightsMatch(page: ReturnType<typeof test['page']>, badges: ReturnType<typeof page['locator']>) {
  const count = await badges.count()
  expect(count).toBeGreaterThanOrEqual(2)

  const heights: number[] = []
  for (let i = 0; i < count; i++) {
    const box = await badges.nth(i).boundingBox()
    if (box) heights.push(box.height)
  }

  expect(heights.length).toBeGreaterThanOrEqual(2)
  const max = Math.max(...heights)
  const min = Math.min(...heights)
  // All badges should be within 6px of each other (accounts for border-2
  // variations between <span> and <button> elements)
  expect(max - min).toBeLessThanOrEqual(6)
}

test.describe('Badge heights on mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('ShowDetail badges have consistent heights on mobile (TV show)', async ({ page }) => {
    await login(page)
    await navigateToShow(page, TMDB_TV)

    // All badge/button elements in the info bar (media type, year, genres, runtime, status)
    const infoBar = page.locator('div.border-b-\\[3px\\]').first()
    await expect(infoBar).toBeVisible({ timeout: 15000 })

    // Select all badges inside the info bar — spans with border-2 and buttons
    const badges = infoBar.locator(
      'span.border-2, button.border-2'
    )
    await assertBadgeHeightsMatch(page, badges)
  })

  test('ShowDetail badges have consistent heights on mobile (Movie)', async ({ page }) => {
    await login(page)
    await navigateToShow(page, TMDB_MOVIE)

    const infoBar = page.locator('div.border-b-\\[3px\\]').first()
    await expect(infoBar).toBeVisible({ timeout: 15000 })

    const badges = infoBar.locator(
      'span.border-2, button.border-2'
    )
    await assertBadgeHeightsMatch(page, badges)
  })

  test('ShowCard badges have consistent heights on mobile (dashboard)', async ({ page }) => {
    await login(page)

    // Navigate to dashboard and wait for show cards
    await page.goto('/dashboard')
    await page.locator('#main-content').waitFor({ state: 'visible', timeout: 20000 })

    // Find all ShowCard poster badges (media type, status, imdb rating)
    const card = page.locator('a[href^="/show/"]').first()
    const cardCount = await card.count()
    if (cardCount === 0) return // no shows tracked, skip

    // Badges are spans with border-2 INSIDE the poster area (the link itself)
    const posterBadges = card.locator('span.border-2')
    const count = await posterBadges.count()
    if (count >= 2) {
      await assertBadgeHeightsMatch(page, posterBadges)
    }
    // If fewer than 2 badges are visible, the test is skipped silently
    // (some shows may not have all badges like IMDb rating)
  })

  test('Stream providers and country dropdown badges match in height', async ({ page }) => {
    await login(page)
    await navigateToShow(page, TMDB_TV)

    // Find the StreamProviders section by the "Stream on" label
    const streamLabel = page.locator('text=Stream on')
    const hasStream = await streamLabel.count()
    if (hasStream === 0) return // no streaming data for this show

    // Grab all bordered elements inside the StreamProviders section
    const providersRow = streamLabel.locator('..').locator('..')
    const providerElements = providersRow.locator('.border-2')

    const count = await providerElements.count()
    if (count >= 2) {
      await assertBadgeHeightsMatch(page, providerElements)
    }
  })
})
