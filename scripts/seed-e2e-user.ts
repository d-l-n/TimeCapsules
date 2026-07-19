import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const sa = JSON.parse(readFileSync('service-account.json', 'utf8'))
const app = initializeApp({ credential: cert(sa) })
const auth = getAuth(app)
const db = getFirestore(app)

const email = process.env.E2E_USER || 'e2e-test@timecapsules.local'
const tmdbId = 1396

async function main() {
  const user = await auth.getUserByEmail(email)
  const uid = user.uid

  await db.collection('shows').doc(String(tmdbId)).set({
    tmdb_id: tmdbId,
    name: 'Breaking Bad',
    poster_url: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYIbiFLHgWdKp3exY6c.jpg',
    imdb_rating: 9.5,
    media_type: 'tv',
  }, { merge: true })

  const prevFollowed = await db.collection('followed_shows').where('user_id', '==', uid).where('show_id', '==', tmdbId).get()
  await Promise.all(prevFollowed.docs.map(d => d.ref.delete()))
  const prevWatch = await db.collection('watchlist').where('user_id', '==', uid).where('show_id', '==', tmdbId).get()
  await Promise.all(prevWatch.docs.map(d => d.ref.delete()))

  await db.collection('followed_shows').add({
    user_id: uid,
    show_id: tmdbId,
    active: 1,
    followed_at: new Date().toISOString(),
  })

  await db.collection('watchlist').add({
    user_id: uid,
    show_id: tmdbId,
    added_at: new Date().toISOString(),
  })

  console.log(`Seeded user ${uid} with show ${tmdbId}`)
  await app.delete()
}

main().catch(e => { console.error(e); process.exit(1) })
