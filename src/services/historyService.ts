import { where, orderBy, limit } from 'firebase/firestore'
import { findMany, buildShowsMap } from '../lib/firestore-utils'
import type { WatchedEpisodeDoc, EpisodeDoc } from '../lib/firebase-queries'

export interface HistoryItem { id: number; watched_at: string; episode_number: number; season_number: number; show_name: string; show_id: number }

export async function getWatchHistory(uid: string): Promise<{ entries: HistoryItem[]; months: string[] }> {
  const [weItems, epItems, showsMap] = await Promise.all([
    findMany<WatchedEpisodeDoc>('watched_episodes', where('user_id', '==', uid), orderBy('watched_at', 'desc'), limit(200)),
    findMany<EpisodeDoc>('episodes'),
    buildShowsMap(),
  ])

  const episodes = new Map<number, EpisodeDoc>()
  epItems.forEach(e => { if (e.tmdb_id) episodes.set(e.tmdb_id, e) })

  const entries: HistoryItem[] = []
  const monthSet = new Set<string>()
  weItems.forEach(w => {
    const ep = episodes.get(w.episode_id)
    if (!ep) return
    const show = showsMap.get(ep.show_id)
    const date = new Date(w.watched_at)
    monthSet.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    entries.push({ id: w.episode_id, watched_at: w.watched_at, episode_number: ep.episode_number, season_number: ep.season_number, show_name: show?.name ?? 'Unknown', show_id: ep.show_id || 0 })
  })

  return { entries, months: [...monthSet].sort().reverse() }
}
