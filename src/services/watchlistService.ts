import { addDoc, collection, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { findMany, exists, deleteOne, buildShowsMap } from '../lib/firestore-utils'
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
  const [items, showsMap] = await Promise.all([
    findMany<WatchlistItemDoc>('watchlist', where('user_id', '==', uid), orderBy('added_at', 'desc')),
    buildShowsMap(),
  ])
  return items.map(w => {
    const s = showsMap.get(w.show_id)
    if (!s) return null
    return { show_id: w.show_id, name: s.name, poster_url: s.poster_url ?? null, imdb_rating: s.imdb_rating ?? null, media_type: s.media_type, added_at: w.added_at }
  }).filter(Boolean) as WatchlistShow[]
}

export async function addToWatchlist(uid: string, showId: number) {
  const existing = await exists('watchlist', where('user_id', '==', uid), where('show_id', '==', showId))
  if (existing) return false
  await addDoc(collection(db, 'watchlist'), { user_id: uid, show_id: showId, added_at: new Date().toISOString() })
  return true
}

export async function removeFromWatchlist(uid: string, showId: number) {
  await deleteOne('watchlist', where('user_id', '==', uid), where('show_id', '==', showId))
}

export async function isInWatchlist(uid: string, showId: number): Promise<boolean> {
  return exists('watchlist', where('user_id', '==', uid), where('show_id', '==', showId))
}
