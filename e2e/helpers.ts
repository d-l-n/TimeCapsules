import type { Page, Locator } from '@playwright/test'

export async function waitForLoadComplete(page: Page) {
  await page.waitForFunction(() => {
    const loading = document.querySelector('[class*="animate-pulse"]')
    return !loading
  }, { timeout: 15000 }).catch(() => {})
}

export async function getShowCards(page: Page): Promise<Locator> {
  return page.locator('a[href^="/show/"]')
}

export async function loginAsGuest(page: Page) {
  await page.goto('/')
  await page.waitForSelector('text=CONTINUE AS GUEST', { timeout: 15000 })
  await page.click('text=CONTINUE AS GUEST')
  await page.waitForSelector('text=CONTINUE AS GUEST ANYWAY', { timeout: 15000 })
  await page.click('text=CONTINUE AS GUEST ANYWAY')
  await page.waitForURL('/dashboard', { timeout: 15000 })
}

const KNOWN_SHOWS = {
  'breaking-bad': 1396,
  'the-matrix': 603,
} as const

export async function navigateToShow(page: Page, tmdbId: number) {
  await page.goto(`/show/-${tmdbId}`)
  await waitForLoadComplete(page)
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-pulse"]') && document.querySelector('h1'),
    { timeout: 20000 },
  ).catch(() => {})
}

export { KNOWN_SHOWS }
