import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('service-account.json', 'utf8'))
const app = initializeApp({ credential: cert(sa) })
const auth = getAuth(app)

const email = process.env.E2E_USER || 'e2e-test@timecapsules.local'
const password = process.env.E2E_PASSWORD || 'te2eAuto!'

async function main() {
  try {
    const user = await auth.getUserByEmail(email)
    console.log(`User already exists: ${user.uid}`)
  } catch (e: any) {
    if (e.code === 'auth/user-not-found') {
      const user = await auth.createUser({ email, password, emailVerified: true })
      console.log(`Created user: ${user.uid}`)
    } else {
      throw e
    }
  }
  await app.delete()
}

main().catch(e => { console.error(e); process.exit(1) })
