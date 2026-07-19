# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-flow.spec.ts >> Dashboard flow >> dashboard shows followed shows section and navigates to detail
- Location: e2e\dashboard-flow.spec.ts:11:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href^="/show/"]').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('a[href^="/show/"]').first()

```

```yaml
- banner:
  - link "TIME CAPSULES — Dashboard":
    - /url: /dashboard
    - text: TC TIME CAPSULES
  - navigation "Dashboard":
    - link "Dashboard":
      - /url: /dashboard
    - link "Library":
      - /url: /library
    - link "Discover":
      - /url: /discover
    - link "Stats":
      - /url: /profile?section=stats
    - link "Account":
      - /url: /profile
  - button "Notifications"
  - button "Dark"
  - link "Profile":
    - /url: /profile
    - text: U e2e-test
- main:
  - heading "Welcome to Time Capsules!" [level=2]
  - paragraph: Start by discovering and tracking your favorite TV shows and movies.
  - link "DISCOVER SHOWS":
    - /url: /discover
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { login, navigateToShow, waitForLoadComplete, KNOWN_SHOWS } from './helpers'
  3  | 
  4  | const TMDB_TV = KNOWN_SHOWS['breaking-bad']
  5  | 
  6  | test.describe('Dashboard flow', () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await login(page)
  9  |   })
  10 | 
  11 |   test('dashboard shows followed shows section and navigates to detail', async ({ page }) => {
  12 |     await waitForLoadComplete(page)
  13 |     const card = page.locator('a[href^="/show/"]').first()
> 14 |     await expect(card).toBeVisible({ timeout: 20000 })
     |                        ^ Error: expect(locator).toBeVisible() failed
  15 |     await card.click()
  16 |     await expect(page).toHaveURL(/\/show\//)
  17 |     await expect(page.locator('h1')).toBeVisible()
  18 |   })
  19 | 
  20 |   test('toggle an episode and see progress change', async ({ page }) => {
  21 |     await navigateToShow(page, TMDB_TV)
  22 |     const toggle = page.locator('button[aria-label*="watched" i], button:has-text("Episode")').first()
  23 |     await expect(toggle).toBeVisible({ timeout: 10000 })
  24 |     const before = await toggle.getAttribute('aria-pressed').catch(() => null)
  25 |     await toggle.click()
  26 |     if (before !== null) {
  27 |       await expect(toggle).not.toHaveAttribute('aria-pressed', before)
  28 |     } else {
  29 |       await expect(toggle).toBeVisible()
  30 |     }
  31 |   })
  32 | 
  33 |   test('returning to dashboard reflects the followed show', async ({ page }) => {
  34 |     await waitForLoadComplete(page)
  35 |     const count = await page.locator('a[href^="/show/"]').count()
  36 |     expect(count).toBeGreaterThan(0)
  37 |   })
  38 | })
  39 | 
```