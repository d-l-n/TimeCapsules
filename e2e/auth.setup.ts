import { test as setup } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const authFile = path.resolve(__dirname, '.auth/user.json')

const email = process.env.PLAYWRIGHT_USER
const password = process.env.PLAYWRIGHT_PASSWORD

setup('authenticate', async ({ page }) => {
  if (!email || !password) {
    console.warn('PLAYWRIGHT_USER / PLAYWRIGHT_PASSWORD not set — skipping auth setup')
    return
  }
  await page.goto('/')
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.getByLabel('Sign in').click()
  await page.waitForURL('/dashboard', { timeout: 15000 })
  await page.context().storageState({ path: authFile })
})
