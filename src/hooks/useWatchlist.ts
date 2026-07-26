import { useEffect, useState, useCallback } from 'react'
import { getWatchlist, isInWatchlist } from '../services/watchlistService'
import { getDevSimState } from '../lib/dev-simulation-types'
import type { WatchlistShow } from '../services/watchlistService'

export type { WatchlistShow }

export function useWatchlist(uid: string | undefined) {
  const [items, setItems] = useState<WatchlistShow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!uid) return

    const sim = getDevSimState()

    if (sim.simulateEmptyState) {
      setItems([])
      setLoading(false)
      return
    }

    if (sim.simulateHighVolume) {
      const mockItems: WatchlistShow[] = []
      const showNames = ['Stranger Things', 'Breaking Bad', 'The Office', 'Game of Thrones', 'Dark', 'Mindhunter', 'Ozark', 'The Crown', 'Black Mirror', 'Westworld']
      const now = Date.now()
      for (let i = 0; i < 200; i++) {
        const daysAgo = Math.floor(Math.random() * 365)
        const d = new Date(now - daysAgo * 86400000)
        mockItems.push({
          show_id: 1000 + (i % 10),
          name: showNames[i % showNames.length],
          poster_url: null,
          imdb_rating: Math.round((6 + Math.random() * 4) * 10) / 10,
          media_type: i % 3 === 0 ? 'movie' : 'tv',
          added_at: d.toISOString(),
        })
      }
      mockItems.sort((a, b) => b.added_at.localeCompare(a.added_at))
      setItems(mockItems)
      setLoading(false)
      return
    }

    setLoading(true)
    const wl = await getWatchlist(uid)
    setItems(wl)
    setLoading(false)
  }, [uid])

  useEffect(() => { refresh() }, [refresh])

  return { items, loading, refresh }
}

export function useWatchlistStatus(uid: string | undefined, showId: number | undefined) {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !showId) return
    isInWatchlist(uid, showId).then(v => { setInWatchlist(v); setLoading(false) })
  }, [uid, showId])

  return { inWatchlist, loading, setInWatchlist }
}
