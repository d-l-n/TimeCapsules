import { test as setup } from '@playwright/test'
import path from 'path'

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const authFile = path.resolve(__dirname, '.auth/user.json')

setup('authenticate as guest', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=CONTINUE AS GUEST', { timeout: 15000 })
  await page.click('text=CONTINUE AS GUEST')
  await page.waitForSelector('text=CONTINUE AS GUEST ANYWAY', { timeout: 15000 })
  await page.click('text=CONTINUE AS GUEST ANYWAY')
  await page.waitForURL('/dashboard', { timeout: 15000 })
  await page.context().storageState({ path: authFile })
})
