import { chromium } from 'playwright'

const TEST_EMAIL = `icon-test-${Date.now()}@test.local`
const TEST_PASSWORD = 'TestPass123!'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  console.log('Logging in...')
  await page.goto('http://localhost:5173/', { timeout: 15000 })
  await page.waitForLoadState('networkidle')

  // Register a new account
  const registerBtn = page.getByLabel('Switch to create account')
  if (await registerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await registerBtn.click()
    await page.waitForTimeout(500)
  }

  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)

  const createBtn = page.getByLabel('Create account')
  if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createBtn.click()
  } else {
    // Already registered, just sign in
    await page.getByLabel('Sign in').click()
  }

  try {
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    console.log('  → Authenticated!')
  } catch {
    console.log('  → Auth check timed out, capturing anyway')
  }

  await page.waitForTimeout(2000)

  // Save auth state to reuse
  const storageState = await context.storageState()

  async function capture(label, width) {
    // Create a new page in a new context but with the saved auth state
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      storageState,
    })
    const p = await ctx.newPage()

    console.log(`\n=== ${label} (${width}px) ===`)

    try {
      await p.goto('http://localhost:5173/dashboard', { timeout: 15000, waitUntil: 'networkidle' })
      await p.waitForTimeout(2000)

      // If tablet, also open the hamburger drawer to see sidebar icons
      if (width >= 768 && width < 1024) {
        // Tablet mode - open the hamburger menu
        const menuBtn = p.locator('button[aria-label*="menu" i], button[aria-label*="Open" i]')
        if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await menuBtn.click()
          await p.waitForTimeout(600)
        }
        // Also take a screenshot WITH the drawer open
        const drawerFilename = `screenshots/icons-${label.toLowerCase().replace(/\s+/g, '-')}-drawer.png`
        await p.screenshot({ path: drawerFilename, fullPage: false })
        console.log(`  → Screenshot with drawer: ${drawerFilename}`)

        // Close drawer for clean tablet header screenshot
        const closeBtn = p.locator('.sidebar-overlay')
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click()
          await p.waitForTimeout(400)
        }
      }

      // Take main screenshot
      const filename = `screenshots/icons-${label.toLowerCase().replace(/\s+/g, '-')}.png`
      await p.screenshot({ path: filename, fullPage: false })
      console.log(`  → Screenshot: ${filename}`)

      // Log visible icon-like elements
      const icons = await p.evaluate(() => {
        const els = document.querySelectorAll('svg, re-icon, .nav-pill-btn svg, .sidebar-link svg, .sidebar-pill re-icon, .sidebar-pill svg')
        const results = []
        els.forEach(el => {
          const tag = el.tagName.toLowerCase()
          const cls = el.getAttribute('class') || ''
          const visible = el.checkVisibility()
          const parent = el.closest('[class*="sidebar"], [class*="nav-pill"], [class*="header"], button')?.className?.slice(0, 60) || ''
          const iconName = tag === 're-icon' ? el.getAttribute('icon') : '(svg)'
          const sizeMatch = cls.match(/w-(\d+)/)
          const size = sizeMatch ? `w-${sizeMatch[1]}` : ''
          results.push({ tag: tag === 're-icon' ? iconName : 'svg', size, visible, parent: parent.slice(0, 40) })
        })
        return results
      })
      console.log('  → Navigation icons:', JSON.stringify(icons, null, 2))

    } catch (err) {
      console.error(`  → Error: ${err.message}`)
    }

    await ctx.close()
  }

  // Desktop: full sidebar visible
  await capture('Desktop', 1440)

  // Tablet: hamburger header (and drawer screenshot)
  await capture('Tablet', 1030)

  // Mobile: bottom nav bar
  await capture('Mobile', 375)

  await browser.close()
  console.log('\n✅ Done!')
}

main().catch(e => { console.error(e); process.exit(1) })
