import 'dotenv/config'
import { firestore } from './firebase-admin.js'

interface GroupMemberDoc {
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

async function main() {
  console.log('=== Migrate group_members to Predictable Doc IDs ===\n')

  const snap = await firestore.collection('group_members').get()
  const total = snap.size
  console.log(`Total group_members docs: ${total}\n`)

  if (total === 0) {
    console.log('  No docs to migrate.')
    return
  }

  let migrated = 0
  let skipped = 0
  let batch = firestore.batch()
  let batchCount = 0

  for (const doc of snap.docs) {
    const data = doc.data() as GroupMemberDoc

    // Skip docs that already have the predictable ID format
    const expectedId = `${data.group_id}${data.user_id}`
    if (doc.id === expectedId) {
      skipped++
      continue
    }

    // Create new doc with predictable ID
    const newRef = firestore.collection('group_members').doc(expectedId)
    batch.set(newRef, {
      group_id: data.group_id,
      user_id: data.user_id,
      role: data.role,
      joined_at: data.joined_at,
    })

    // Delete old doc
    batch.delete(doc.ref)

    batchCount += 2
    migrated++

    // Firestore batch limit is 500 operations
    if (batchCount >= 490) {
      await batch.commit()
      console.log(`  Batch committed: ${migrated} migrated so far...`)
      batch = firestore.batch()
      batchCount = 0
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit()
  }

  console.log(`\n─── Summary ───`)
  console.log(`  Total docs scanned:  ${total}`)
  console.log(`  Migrated:            ${migrated}`)
  console.log(`  Skipped (already OK): ${skipped}`)

  if (migrated === 0) {
    console.log('\n  ✅ All group_members already have predictable doc IDs!')
  } else {
    console.log(`\n  ✅ Migration complete — ${migrated} docs migrated.`)
    console.log('  Run `npm run qa:validate` to verify data integrity.')
  }

  console.log('\n=== Done ===')
}

main().catch(err => { console.error(err); process.exit(1) })
