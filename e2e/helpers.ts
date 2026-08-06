import { expect, type Page, type Locator } from '@playwright/test'

export async function waitForLoadComplete(page: Page) {
  await page.waitForFunction(() => {
    const loading = document.querySelector('[class*="animate-pulse"]')
    return !loading
  }, null, { timeout: 30000 }).catch(() => {})
}

export async function getShowCards(page: Page): Promise<Locator> {
  return page.locator('a[href^="/show/"]')
}

export async function login(page: Page) {
  const email = process.env.PLAYWRIGHT_USER || 'e2e-test@timecapsules.local'
  const password = process.env.PLAYWRIGHT_PASSWORD || 'te2eAuto!'
  await page.goto('/')
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByRole('button', { name: 'SIGN IN', exact: true }).click()
  await expect(page).toHaveURL('/dashboard', { timeout: 20000 })
  await page.locator('#main-content').waitFor({ state: 'visible', timeout: 20000 })
  await waitForLoadComplete(page)
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
