import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import fs from 'fs'
import 'dotenv/config'

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!serviceAccountPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env var required')

if (getApps().length === 0) {
  initializeApp({
    credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))),
  })
}

const firestore = getFirestore()

export { firestore, Timestamp }
