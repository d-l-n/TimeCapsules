import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { loginAsGuest, waitForLoadComplete } from './helpers'

test.describe('Accessibility', () => {
  test('login page has no critical violations', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('h1')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze()
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test.describe('authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsGuest(page)
      await waitForLoadComplete(page)
    })

    const pages = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/discover', name: 'discover' },
      { path: '/profile', name: 'profile' },
      { path: '/upcoming', name: 'upcoming' },
    ]

    for (const { path, name } of pages) {
      test(`${name} page has no critical/serious violations`, async ({ page }) => {
        await page.goto(path)
        await waitForLoadComplete(page)
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
          .analyze()
        expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
      })
    }
  })
})
