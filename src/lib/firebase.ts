import { type Firestore } from 'firebase/firestore'
import { app } from './firebase-auth'

export { auth, googleProvider } from './firebase-auth'

let _db: Firestore | null = null

export async function getDb(): Promise<Firestore> {
  if (!_db) {
    const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = await import('firebase/firestore')
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  }
  return _db
}
