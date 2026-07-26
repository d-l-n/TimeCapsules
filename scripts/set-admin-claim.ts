/**
 * Set admin custom claim for a Firebase user.
 *
 * Usage:
 *   npx tsx scripts/set-admin-claim.ts <uid>
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH in .env
 * (same as other scripts)
 */
import 'dotenv/config'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import fs from 'fs'

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!serviceAccountPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env var required')

if (getApps().length === 0) {
  initializeApp({
    credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))),
  })
}

const uid = process.argv[2]
if (!uid) {
  console.error('Usage: npx tsx scripts/set-admin-claim.ts <uid>')
  process.exit(1)
}

await getAuth().setCustomUserClaims(uid, { admin: true })
console.log(`✅ Admin claim set for user: ${uid}`)
