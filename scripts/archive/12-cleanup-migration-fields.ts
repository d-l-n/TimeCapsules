import 'dotenv/config'
import { firestore } from './firebase-admin.js'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Dead fields from old TV Time / migration data that are no longer in any
 * TypeScript interface or Firestore Rules allowFields() list, but may still
 * exist in actual Firestore documents — causing allowFields() to reject every
 * update/delete for those documents.
 *
 * Collection → fields to remove:
 *
 *  user_stats:      nb_shows_followed, score, tv_time_user_id
 *  followed_shows:  diffusion, tv_time_user_id, show_tv_time_id
 *  watched_episodes: tv_time_user_id, episode_tv_time_id
 *  ratings:          tv_time_user_id, show_tv_time_id
 *  episode_emotions: tv_time_user_id, episode_tv_time_id
 */

interface CleanupTarget {
  collection: string
  label: string
  deadFields: string[]
}

const TARGETS: CleanupTarget[] = [
  { collection: 'user_stats',      label: 'User Stats',          deadFields: ['nb_shows_followed', 'score', 'tv_time_user_id'] },
  { collection: 'followed_shows',  label: 'Followed Shows',      deadFields: ['diffusion', 'tv_time_user_id', 'show_tv_time_id'] },
  { collection: 'watched_episodes', label: 'Watched Episodes',   deadFields: ['tv_time_user_id', 'episode_tv_time_id'] },
  { collection: 'ratings',         label: 'Ratings',             deadFields: ['tv_time_user_id', 'show_tv_time_id'] },
  { collection: 'episode_emotions', label: 'Episode Emotions',   deadFields: ['tv_time_user_id', 'episode_tv_time_id'] },
]

const BATCH_SIZE = 500

async function cleanCollection(target: CleanupTarget): Promise<{ scanned: number; cleaned: number; totalDead: number }> {
  const { collection, label, deadFields } = target
  const snap = await firestore.collection(collection).get()
  const total = snap.size
  if (total === 0) {
    console.log(`  ${label.padEnd(22)} 0 docs — skip`)
    return { scanned: 0, cleaned: 0, totalDead: 0 }
  }

  let cleaned = 0
  let totalDead = 0
  let docIndex = 0

  // Process in batches to avoid memory issues
  const docs = snap.docs
  for (let start = 0; start < docs.length; start += BATCH_SIZE) {
    const batch = firestore.batch()
    let batchChanges = 0
    const chunk = docs.slice(start, start + BATCH_SIZE)

    for (const doc of chunk) {
      docIndex++
      const data = doc.data()
      const fieldsToRemove: string[] = []

      for (const field of deadFields) {
        if (field in data) {
          fieldsToRemove.push(field)
        }
      }

      if (fieldsToRemove.length > 0) {
        // Use FieldValue.delete() to remove the field
        const updates: Record<string, any> = {}
        for (const f of fieldsToRemove) {
          updates[f] = FieldValue.delete()
        }
        batch.update(doc.ref, updates)
        batchChanges++
        cleaned++
        totalDead += fieldsToRemove.length
      }
    }

    if (batchChanges > 0) {
      await batch.commit()
    }

    const pct = Math.round((docIndex / total) * 100)
    process.stdout.write(`  ${label.padEnd(22)} ${String(docIndex).padStart(5)}/${total} (${pct}%) — ${cleaned} docs cleaned\r`)
  }

  process.stdout.write('\n')
  return { scanned: total, cleaned, totalDead }
}

async function main() {
  console.log('=== Cleanup Migration Fields ===\n')

  const allDeadFields = new Set(TARGETS.flatMap(t => t.deadFields))
  console.log(`Dead fields to remove: ${[...allDeadFields].join(', ')}\n`)

  let totalScanned = 0
  let totalCleaned = 0
  let totalDeadRemoved = 0

  for (const target of TARGETS) {
    const result = await cleanCollection(target)
    totalScanned += result.scanned
    totalCleaned += result.cleaned
    totalDeadRemoved += result.totalDead
  }

  console.log(`\n─── Summary ───`)
  console.log(`  Scanned:        ${totalScanned} docs`)
  console.log(`  Docs cleaned:   ${totalCleaned} docs (had at least one dead field)`)
  console.log(`  Dead fields removed: ${totalDeadRemoved}`)

  if (totalCleaned === 0) {
    console.log('\n  ✅ No dead fields found — Firestore is clean!')
  } else {
    console.log('\n  ✅ Done — fields removed. Run `npm run qa:validate` to verify.')
  }

  console.log('\n=== Done ===')
}

main().catch(err => { console.error(err); process.exit(1) })
