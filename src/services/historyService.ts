import { where, orderBy, limit } from 'firebase/firestore'
import { findMany, buildShowsMap } from '../lib/firestore-utils'
import type { WatchedEpisodeDoc, EpisodeDoc } from '../lib/firebase-queries'

export interface HistoryItem { id: number; watched_at: string; episode_number: number; season_number: number; show_name: string; show_id: number; is_movie?: boolean }

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
    if (ep) {
      const show = showsMap.get(ep.show_id)
      const date = new Date(w.watched_at)
      monthSet.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
      entries.push({ id: w.episode_id, watched_at: w.watched_at, episode_number: ep.episode_number, season_number: ep.season_number, show_name: show?.name ?? 'Unknown', show_id: ep.show_id || 0 })
    } else {
      // Movie entries: episode_id === show_id (tmdb_id), not in episodes collection
      const sid = w.show_id
      if (sid) {
        const show = showsMap.get(sid)
        if (show) {
          const date = new Date(w.watched_at)
          monthSet.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
          entries.push({ id: sid, watched_at: w.watched_at, episode_number: 1, season_number: 0, show_name: show.name, show_id: sid, is_movie: true })
        }
      }
    }
  })

  return { entries, months: [...monthSet].sort().reverse() }
}
