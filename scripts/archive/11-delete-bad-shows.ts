import 'dotenv/config'
import { firestore } from './firebase-admin.js'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || ''
const WRITE_BATCH = 450
const QUERY_BATCH = 10

async function tmdbExists(tmdbId: number): Promise<boolean> {
  const check = async (type: 'tv' | 'movie') => {
    const res = await fetch(`${TMDB_API_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`)
    return res.ok
  }
  return (await check('tv')) || (await check('movie'))
}

async function deleteDocs(ids: string[], collection: string) {
  for (let i = 0; i < ids.length; i += WRITE_BATCH) {
    const batch = firestore.batch()
    for (const id of ids.slice(i, i + WRITE_BATCH)) batch.delete(firestore.collection(collection).doc(id))
    await batch.commit()
  }
}

async function collectWhereIn(ids: number[], collection: string, field: string): Promise<string[]> {
  const allDocIds: string[] = []
  for (let i = 0; i < ids.length; i += QUERY_BATCH) {
    const chunk = ids.slice(i, i + QUERY_BATCH)
    const snap = await firestore.collection(collection).where(field, 'in', chunk).get()
    for (const d of snap.docs) allDocIds.push(d.id)
  }
  return allDocIds
}

interface BadShow {
  docId: string
  tmdbId: number
  name: string
}

async function main() {
  if (!TMDB_API_KEY) {
    console.error('ERROR: VITE_TMDB_API_KEY env var required')
    process.exit(1)
  }

  console.log('=== Delete shows not on TMDB ===\n')

  const allShows = await firestore.collection('shows').get()
  const badShows: BadShow[] = []

  for (const doc of allShows.docs) {
    const data = doc.data()
    const tmdbId = data.tmdb_id as number | undefined
    const name = (data.name as string) || 'Unknown'
    if (!tmdbId) continue
    process.stdout.write(`  Checking ${name.padEnd(40)} tmdb:${String(tmdbId).padEnd(8)} ... `)
    const exists = await tmdbExists(tmdbId)
    if (exists) {
      console.log('OK')
    } else {
      badShows.push({ docId: doc.id, tmdbId, name })
      console.log('BAD')
    }
  }

  if (badShows.length === 0) {
    console.log('\nNo bad shows found. Nothing to clean.')
    return
  }

  console.log(`\n--- ${badShows.length} bad shows found ---\n`)
  const badIds = badShows.map(s => s.tmdbId)
  const badDocIds = badShows.map(s => s.docId)

  console.log('Collecting related documents...')
  const deletions: { collection: string; ids: string[] }[] = [
    { collection: 'shows', ids: badDocIds },
  ]

  for (const [col, field] of [['episodes', 'show_id'], ['followed_shows', 'show_id'], ['ratings', 'show_id'], ['watchlist', 'show_id'], ['resume_positions', 'show_id']] as const) {
    const ids = await collectWhereIn(badIds, col, field)
    if (ids.length > 0) deletions.push({ collection: col, ids })
    console.log(`  ${col}: ${ids.length} docs`)
  }

  const weIds = await collectWhereIn(badIds, 'watched_episodes', 'show_id')
  if (weIds.length > 0) deletions.push({ collection: 'watched_episodes', ids: weIds })
  console.log(`  watched_episodes: ${weIds.length} docs`)

  const epIds = await collectWhereIn(badIds, 'episodes', 'show_id')
  if (epIds.length > 0) {
    const epNums = epIds.map(id => parseInt(id.replace('ep', ''), 10) || 0)
    const eeIds: string[] = []
    for (let i = 0; i < epNums.length; i += QUERY_BATCH) {
      const snap = await firestore.collection('episode_emotions').where('episode_id', 'in', epNums.slice(i, i + QUERY_BATCH)).get()
      for (const d of snap.docs) eeIds.push(d.id)
    }
    if (eeIds.length > 0) deletions.push({ collection: 'episode_emotions', ids: eeIds })
    console.log(`  episode_emotions: ${eeIds.length} docs`)
  }

  const gsIds = await collectWhereIn(badIds, 'group_shows', 'show_id')
  if (gsIds.length > 0) deletions.push({ collection: 'group_shows', ids: gsIds })
  console.log(`  group_shows: ${gsIds.length} docs`)

  const listsSnap = await firestore.collection('custom_lists').get()
  let listUpdates = 0
  for (const doc of listsSnap.docs) {
    const showIds = doc.data().show_ids as number[] | undefined
    if (!showIds) continue
    const filtered = showIds.filter(sid => !badIds.includes(sid))
    if (filtered.length !== showIds.length) {
      await doc.ref.update({ show_ids: filtered })
      listUpdates++
    }
  }
  console.log(`  custom_lists updated: ${listUpdates}`)

  const total = deletions.reduce((sum, d) => sum + d.ids.length, 0)
  console.log(`\nTotal docs to delete: ${total}`)

  if (total === 0) {
    console.log('Nothing to delete.')
    return
  }

  console.log('\nDeleting...')
  for (const del of deletions) {
    if (del.ids.length === 0) continue
    console.log(`  ${del.collection}: ${del.ids.length} docs`)
    await deleteDocs(del.ids, del.collection)
  }

  console.log(`\n=== Done. ${badShows.length} shows removed ===`)
  for (const s of badShows) console.log(`  - ${s.name} (tmdb:${s.tmdbId})`)
}

main().catch(err => { console.error(err); process.exit(1) })