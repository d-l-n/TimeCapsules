import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

const PAIR_ID = 'e2e-pairing'
const FAKE_UID = 'e2e-qr-user'
const DEVICE = { type: 'desktop', browser: 'Chrome', os: 'Windows' }

const b64url = (s: string) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const IDENTITY_TOOLKIT_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit'

function fakeCustomToken(uid: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ iss: 'e2e', sub: 'e2e', aud: IDENTITY_TOOLKIT_AUD, iat: now, exp: now + 3600, uid }),
  )
  return `${header}.${payload}.e2e`
}

async function mockPairingApi(page: Page, pendingPolls = 2) {
  let pollCount = 0
  await page.route('**/api/pair', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: PAIR_ID }) }),
  )
  await page.route(`**/api/pair/${PAIR_ID}`, route => {
    pollCount += 1
    if (pollCount > pendingPolls) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'done', customToken: fakeCustomToken(FAKE_UID) }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'pending', device: DEVICE }),
    })
  })
}

test.describe('QR login', () => {
  test('login page has a QR button that opens /qr', async ({ page }) => {
    await mockPairingApi(page, 1000)
    await page.goto('/')
    await page.getByRole('button', { name: 'SIGN IN WITH QR' }).click()
    await expect(page).toHaveURL('/qr')
  })

  test('/qr shows the QR code and the waiting state', async ({ page }) => {
    await mockPairingApi(page, 1000)
    await page.goto('/qr')
    await expect(page.getByText('SCAN TO SIGN IN')).toBeVisible()
    await expect(page.getByAltText('QR code')).toBeVisible()
    await expect(page.getByText(/WAITING FOR SCAN/i)).toBeVisible()
    await expect(page.getByText(/scan this code with your phone camera/i)).toBeVisible()
  })

  test('phone shows the requesting device and confirms the pairing', async ({ page }) => {
    let confirmedToken = ''
    let confirmCalls = 0
    await page.route(`**/api/pair/${PAIR_ID}`, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'pending', device: DEVICE }),
      }),
    )
    await page.route(`**/api/pair/${PAIR_ID}/confirm`, route => {
      confirmCalls += 1
      const data = route.request().postDataJSON() as { idToken?: string }
      confirmedToken = data?.idToken ?? ''
      if (confirmCalls === 1) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    })

    await login(page)
    await page.goto(`/pair?code=${PAIR_ID}`)

    await expect(page.getByText('Desktop · Chrome · Windows')).toBeVisible()
    await page.getByRole('button', { name: 'YES, SIGN IN' }).click()
    await expect(page.getByText('DONE!')).toBeVisible({ timeout: 15000 })
    expect(confirmCalls).toBe(2)
    expect(confirmedToken.length).toBeGreaterThan(20)
  })

  test('PC completes the QR login and lands on the dashboard', async ({ page }) => {
    await mockPairingApi(page, 2)
    await page.goto('/qr')
    await expect(page.getByAltText('QR code')).toBeVisible()
    await expect(page).toHaveURL('/dashboard', { timeout: 20000 })
  })
})
