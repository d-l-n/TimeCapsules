import 'dotenv/config'
import { firestore } from './firebase-admin.js'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || ''
const BATCH_SIZE = 10
const RATE_LIMIT_MS = 300

async function tmdbCheck(tmdbId: number, mediaType: 'tv' | 'movie'): Promise<boolean> {
  const url = `${TMDB_API_BASE}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`
  const res = await fetch(url)
  return res.ok
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  if (!TMDB_API_KEY) {
    console.error('ERROR: VITE_TMDB_API_KEY env var is required')
    process.exit(1)
  }

  console.log('=== Fix media_type in Firestore ===\n')

  const allShows = await firestore.collection('shows').get()
  console.log(`Total shows in Firestore: ${allShows.size}\n`)

  const toFix: { docId: string; name: string; tmdbId: number; storedType: string; correctType: string }[] = []
  const missing: { docId: string; name: string; tmdbId: number }[] = []
  let okCount = 0
  let checked = 0

  for (const doc of allShows.docs) {
    const data = doc.data()
    const tmdbId = data.tmdb_id as number | undefined
    const storedType = data.media_type as string | undefined
    const name = (data.name as string) || 'Unknown'

    if (!tmdbId) continue

    const initialType = storedType === 'movie' ? 'movie' : 'tv'
    const isOk = await tmdbCheck(tmdbId, initialType as 'tv' | 'movie')

    if (isOk) {
      okCount++
    } else {
      // Try the other type
      const fallbackType = initialType === 'movie' ? 'tv' : 'movie'
      const fallbackOk = await tmdbCheck(tmdbId, fallbackType as 'tv' | 'movie')
      if (fallbackOk) {
        toFix.push({ docId: doc.id, name, tmdbId, storedType: storedType || 'none', correctType: fallbackType })
        console.log(`  ✗ ${name.padEnd(40)} tmdb:${String(tmdbId).padEnd(8)} stored:${(storedType || 'none').padEnd(6)} → ${fallbackType}`)
      } else {
        missing.push({ docId: doc.id, name, tmdbId })
        console.log(`  ? ${name.padEnd(40)} tmdb:${String(tmdbId).padEnd(8)} not found on TMDB (either type)`)
      }
    }

    checked++
    if (checked % BATCH_SIZE === 0) {
      console.log(`  ... checked ${checked}/${allShows.size}\n`)
      await sleep(RATE_LIMIT_MS)
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`  Checked:     ${checked}`)
  console.log(`  Correct:     ${okCount}`)
  console.log(`  Fixed:       ${toFix.length}`)
  console.log(`  Not on TMDB: ${missing.length}`)

  if (toFix.length > 0) {
    console.log(`\n--- Fixing ${toFix.length} shows in Firestore ---\n`)
    let fixed = 0
    for (const item of toFix) {
      await firestore.collection('shows').doc(item.docId).update({ media_type: item.correctType })
      fixed++
      if (fixed % BATCH_SIZE === 0) {
        console.log(`  ... updated ${fixed}/${toFix.length}`)
        await sleep(RATE_LIMIT_MS)
      }
    }
    console.log(`\n  Updated ${fixed} shows ✓`)
  }

  if (missing.length > 0) {
    console.log(`\n--- Shows not found on TMDB (either type) ---`)
    for (const item of missing.slice(0, 20)) {
      console.log(`  ${item.name.padEnd(40)} tmdb:${item.tmdbId}`)
    }
    if (missing.length > 20) {
      console.log(`  ... and ${missing.length - 20} more`)
    }
  }

  console.log('\n=== Done ===')
}

main().catch(err => { console.error(err); process.exit(1) })
