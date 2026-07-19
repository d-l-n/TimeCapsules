# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-flow.spec.ts >> Dashboard flow >> returning to dashboard reflects the followed show
- Location: e2e\dashboard-flow.spec.ts:33:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "TIME CAPSULES — Dashboard" [ref=e5] [cursor=pointer]:
      - /url: /dashboard
      - generic [ref=e6]: TC
      - generic [ref=e7]: TIME CAPSULES
    - navigation "Dashboard" [ref=e8]:
      - link "Dashboard" [ref=e9] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e11]
        - generic [ref=e16]: Dashboard
      - link "Library" [ref=e17] [cursor=pointer]:
        - /url: /library
        - img [ref=e19]
        - generic [ref=e23]: Library
      - link "Discover" [ref=e24] [cursor=pointer]:
        - /url: /discover
        - img [ref=e26]
        - generic [ref=e29]: Discover
      - link "Stats" [ref=e30] [cursor=pointer]:
        - /url: /profile?section=stats
        - img [ref=e32]
        - generic [ref=e34]: Stats
      - link "Account" [ref=e35] [cursor=pointer]:
        - /url: /profile
        - img [ref=e37]
        - generic [ref=e40]: Account
    - generic [ref=e41]:
      - generic [ref=e42]:
        - button "Notifications" [ref=e44]:
          - img [ref=e45]
        - button "Dark" [ref=e48]:
          - img [ref=e49]
      - link "Profile" [ref=e52] [cursor=pointer]:
        - /url: /profile
        - generic [ref=e53]: U
        - generic [ref=e54]: e2e-test
  - main [ref=e55]:
    - generic [ref=e57]:
      - heading "Welcome to Time Capsules!" [level=2] [ref=e58]
      - paragraph [ref=e59]: Start by discovering and tracking your favorite TV shows and movies.
      - link "DISCOVER SHOWS" [ref=e61] [cursor=pointer]:
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
  14 |     await expect(card).toBeVisible({ timeout: 20000 })
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
> 36 |     expect(count).toBeGreaterThan(0)
     |                   ^ Error: expect(received).toBeGreaterThan(expected)
  37 |   })
  38 | })
  39 | 
```