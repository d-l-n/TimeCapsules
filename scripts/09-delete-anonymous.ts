import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import fs from 'fs'
import 'dotenv/config'

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!serviceAccountPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env var required')

if (getApps().length === 0) {
  initializeApp({
    credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))),
  })
}

const auth = getAuth()

async function main() {
  console.log('Listing anonymous users...\n')
  let deleted = 0
  let nextPageToken: string | undefined

  do {
    const result = await auth.listUsers(1000, nextPageToken)
    const anon = result.users.filter(u => u.providerData.length === 0)

    for (const user of anon) {
      console.log(`  Deleting anonymous: ${user.uid} (created ${user.metadata.creationTime})`)
      await auth.deleteUser(user.uid)
      deleted++
    }

    nextPageToken = result.pageToken
  } while (nextPageToken)

  console.log(`\nDeleted ${deleted} anonymous users.`)
}

main().catch(err => { console.error(err); process.exit(1) })
