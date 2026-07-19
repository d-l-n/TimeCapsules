import 'dotenv/config'
import { firestore } from './firebase-admin.js'

const COLLECTIONS_TO_DELETE = [
  'shows',
  'episodes',
  'followed_shows',
  'watched_episodes',
  'ratings',
  'badges',
  'episode_emotions',
  'user_stats',
  'resume_positions',
  'watchlist',
  'custom_lists',
  'groups',
  'group_members',
  'group_shows',
  'group_watch_events',
  'notifications',
  'user_profiles',
]

async function deleteAll(collectionId: string) {
  const snap = await firestore.collection(collectionId).get()
  if (snap.size === 0) { console.log(`  ${collectionId}: 0 docs, nothing to delete`); return }
  let i = 0
  const batchSize = 500
  const docs = snap.docs
  for (let start = 0; start < docs.length; start += batchSize) {
    const batch = firestore.batch()
    const chunk = docs.slice(start, start + batchSize)
    for (const doc of chunk) batch.delete(doc.ref)
    await batch.commit()
    i += chunk.length
    process.stdout.write(`  ${collectionId}: ${i}/${snap.size}...\r`)
  }
  console.log(`  ${collectionId}: ${snap.size} docs deleted`)
}

async function main() {
  console.log('=== RESET: Deleting all collections ===\n')
  for (const col of COLLECTIONS_TO_DELETE) await deleteAll(col)
  console.log('\n=== RESET COMPLETE ===')
}

main().catch(err => { console.error(err); process.exit(1) })
