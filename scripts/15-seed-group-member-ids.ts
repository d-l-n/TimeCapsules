import 'dotenv/config'
import { firestore } from './firebase-admin.js'

interface GroupDoc {
  name: string
  created_by: string
  created_at: string
  invite_code: string
  member_ids?: string[]
}

interface GroupMemberDoc {
  group_id: string
  user_id: string
}

async function main() {
  console.log('=== Seed member_ids for existing groups ===\n')

  const groupsSnap = await firestore.collection('groups').get()
  const total = groupsSnap.size
  console.log(`Total groups: ${total}\n`)

  if (total === 0) {
    console.log('  No groups to process.')
    return
  }

  let updated = 0
  let skipped = 0

  for (const doc of groupsSnap.docs) {
    const data = doc.data() as GroupDoc

    // Skip if already has member_ids
    if (data.member_ids && data.member_ids.length > 0) {
      skipped++
      continue
    }

    // Collect all member UIDs from group_members for this group
    const membersSnap = await firestore.collection('group_members')
      .where('group_id', '==', doc.id)
      .get()

    const memberIds = new Set<string>()
    membersSnap.docs.forEach(m => {
      const mData = m.data() as GroupMemberDoc
      memberIds.add(mData.user_id)
    })

    // Fallback: at minimum include the creator
    if (memberIds.size === 0) {
      memberIds.add(data.created_by)
    }

    await doc.ref.update({
      member_ids: [...memberIds],
    })
    updated++
    console.log(`  Group "${data.name}" (${doc.id}): ${memberIds.size} members seeded`)
  }

  console.log(`\n─── Summary ───`)
  console.log(`  Total groups: ${total}`)
  console.log(`  Updated:      ${updated}`)
  console.log(`  Skipped:      ${skipped}`)

  if (updated === 0) {
    console.log('\n  ✅ All groups already have member_ids!')
  } else {
    console.log(`\n  ✅ Done — ${updated} groups updated with member_ids.`)
  }

  console.log('\n=== Done ===')
}

main().catch(err => { console.error(err); process.exit(1) })
