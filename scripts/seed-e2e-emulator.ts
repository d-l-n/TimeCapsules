import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, collection, addDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'emulator-key',
  authDomain: 'localhost',
  projectId: 'timecapsule-theproject',
  storageBucket: 'localhost',
  messagingSenderId: '0',
  appId: 'emulator-app',
}

const app = initializeApp(firebaseConfig, 'e2e-seed')
const auth = getAuth(app)
const db = getFirestore(app)

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 8080)

const TEST_EMAIL = 'e2e-test@timecapsules.local'
const TEST_PASSWORD = 'te2eAuto!'

async function main() {
  console.log('=== Seeding e2e emulator data ===\n')

  // Create or sign in test user
  let uid: string
  try {
    const cred = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    uid = cred.user.uid
    console.log(`Created user: ${uid}`)
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
      uid = cred.user.uid
      console.log(`User already exists: ${uid}`)
    } else {
      throw e
    }
  }

  // Seed a show (Breaking Bad)
  await setDoc(doc(db, 'shows', '1396'), {
    tmdb_id: 1396,
    name: 'Breaking Bad',
    poster_url: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYIbiFLHgWdKp3exY6c.jpg',
    backdrop_url: null,
    synopsis: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
    imdb_rating: 9.5,
    imdb_votes: 2000000,
    imdb_id: 'tt0903747',
    media_type: 'tv',
  })
  console.log('Seeded show: Breaking Bad (1396)')

  // Follow the show
  await addDoc(collection(db, 'followed_shows'), {
    user_id: uid,
    show_id: 1396,
    active: 1,
    followed_at: new Date().toISOString(),
  })
  console.log('Seeded followed_show')

  // Add to watchlist
  await addDoc(collection(db, 'watchlist'), {
    user_id: uid,
    show_id: 1396,
    added_at: new Date().toISOString(),
  })
  console.log('Seeded watchlist')

  // Seed The Matrix
  await setDoc(doc(db, 'shows', '603'), {
    tmdb_id: 603,
    name: 'The Matrix',
    poster_url: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdrop_url: null,
    synopsis: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
    imdb_rating: 8.7,
    imdb_votes: 2000000,
    imdb_id: 'tt0133093',
    media_type: 'movie',
  })
  console.log('Seeded show: The Matrix (603)')

  console.log('\n=== Seeding complete! ===')
  console.log(`User: ${TEST_EMAIL} / ${TEST_PASSWORD}`)
  console.log(`Shows: Breaking Bad (1396), The Matrix (603)`)
}

main().catch(e => { console.error(e); process.exit(1) })
