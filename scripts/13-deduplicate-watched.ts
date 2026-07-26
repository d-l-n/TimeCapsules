import 'dotenv/config'
import { firestore, Timestamp } from './firebase-admin.js'

interface WeDoc {
  id: string
  user_id: string
  episode_id: number
  show_id: number
  watched_at: string | Timestamp | null
}

async function main() {
  console.log('=== Deduplicate watched_episodes ===\n')

  const snap = await firestore.collection('watched_episodes').get()
  const total = snap.size
  console.log(`Total watched_episodes docs: ${total}\n`)

  if (total === 0) {
    console.log('  No docs to process.')
    return
  }

  // Group by (user_id, episode_id)
  const groups = new Map<string, WeDoc[]>()
  for (const doc of snap.docs) {
    const data = doc.data() as WeDoc
    const key = `${data.user_id}:${data.episode_id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ ...data, id: doc.id })
  }

  const totalKeys = groups.size
  let dupKeys = 0
  let totalRemoved = 0
  const affectedUsers = new Set<string>()
  let processed = 0

  for (const [key, docs] of groups) {
    if (docs.length <= 1) continue
    dupKeys++

    // Sort by watched_at (ascending) — keep the earliest
    docs.sort((a, b) => {
      const ta = a.watched_at
      const tb = b.watched_at
      if (!ta && !tb) return 0
      if (!ta) return -1
      if (!tb) return 1
      const sa = typeof ta === 'string' ? ta : (ta as Timestamp).toDate().toISOString()
      const sb = typeof tb === 'string' ? tb : (tb as Timestamp).toDate().toISOString()
      return sa.localeCompare(sb)
    })

    // Keep the first (earliest), delete the rest
    const [keep, ...dupes] = docs
    const batch = firestore.batch()
    for (const d of dupes) {
      batch.delete(firestore.collection('watched_episodes').doc(d.id))
    }
    await batch.commit()

    totalRemoved += dupes.length
    affectedUsers.add(keep.user_id)
    processed++
  }

  // Recalculate stats for affected users
  console.log(`\nUnique (user_id, episode_id) pairs: ${totalKeys}`)
  console.log(`Groups with duplicates: ${dupKeys}`)
  console.log(`Duplicate docs removed: ${totalRemoved}`)
  console.log(`Affected users: ${affectedUsers.size}`)

  if (affectedUsers.size > 0) {
    console.log(`\nRecalculating user_stats for ${affectedUsers.size} users…`)
    let statsFixed = 0
    for (const uid of affectedUsers) {
      // Count unique watched episodes per user
      const userSnap = await firestore.collection('watched_episodes')
        .where('user_id', '==', uid)
        .get()

      const uniqueEps = new Set<number>()
      userSnap.docs.forEach(d => uniqueEps.add(d.data().episode_id as number))
      const correctCount = uniqueEps.size

      // Update stats
      const statsSnap = await firestore.collection('user_stats')
        .where('user_id', '==', uid)
        .limit(1)
        .get()

      if (!statsSnap.empty) {
        await statsSnap.docs[0].ref.update({
          nb_episodes_watched: correctCount,
          time_spent: correctCount * 30,
        })
        statsFixed++
      } else {
        // Create stats doc if missing
        await firestore.collection('user_stats').doc(uid).set({
          user_id: uid,
          nb_episodes_watched: correctCount,
          time_spent: correctCount * 30,
        })
        statsFixed++
      }
    }
    console.log(`  Stats updated for ${statsFixed} users (${affectedUsers.size - statsFixed} had no stats doc — created new)`)
  }

  console.log(`\n─── Summary ───`)
  console.log(`  Scanned:          ${total} docs`)
  console.log(`  Unique pairs:     ${totalKeys}`)
  console.log(`  Duplicate groups: ${dupKeys}`)
  console.log(`  Removed:          ${totalRemoved} docs`)

  if (totalRemoved === 0) {
    console.log(`\n  ✅ No duplicates found — watched_episodes is clean!`)
  } else {
    console.log(`\n  ✅ Done — duplicates removed. Run \`npm run qa:validate\` to verify.`)
  }

  console.log('\n=== Done ===')
}

main().catch(err => { console.error(err); process.exit(1) })
