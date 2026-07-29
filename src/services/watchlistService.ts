import { addDoc, collection, query, getDocs, deleteDoc, where, orderBy, limit } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { buildShowsMap } from './showService'
import type { WatchlistItemDoc } from '../lib/firebase-queries'

export interface WatchlistShow {
  show_id: number
  name: string
  poster_url: string | null
  imdb_rating: number | null
  media_type?: 'movie' | 'tv'
  added_at: string
}

export async function getWatchlist(uid: string): Promise<WatchlistShow[]> {
  const db = await getDb()
  const [wlSnap, showsMap] = await Promise.all([
    getDocs(query(collection(db, 'watchlist'), where('user_id', '==', uid), orderBy('added_at', 'desc'))),
    buildShowsMap(),
  ])
  const items = wlSnap.docs.map(d => ({ ...(d.data() as WatchlistItemDoc), id: d.id }))
  return items.map(w => {
    const s = showsMap.get(w.show_id)
    if (!s) return null
    return { show_id: w.show_id, name: s.name, poster_url: s.poster_url ?? null, imdb_rating: s.imdb_rating ?? null, media_type: s.media_type, added_at: w.added_at }
  }).filter(Boolean) as WatchlistShow[]
}

export async function addToWatchlist(uid: string, showId: number) {
  const db = await getDb()
  const exSnap = await getDocs(query(collection(db, 'watchlist'), where('user_id', '==', uid), where('show_id', '==', showId), limit(1)))
  const existing = !exSnap.empty
  if (existing) return false
  await addDoc(collection(db, 'watchlist'), { user_id: uid, show_id: showId, added_at: new Date().toISOString() })
  return true
}

export async function removeFromWatchlist(uid: string, showId: number) {
  const db = await getDb()
  const snap = await getDocs(query(collection(db, 'watchlist'), where('user_id', '==', uid), where('show_id', '==', showId)))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

export async function isInWatchlist(uid: string, showId: number): Promise<boolean> {
  const db = await getDb()
  const snap = await getDocs(query(collection(db, 'watchlist'), where('user_id', '==', uid), where('show_id', '==', showId), limit(1)))
  return !snap.empty
}
