import { useEffect, useState, useCallback } from 'react'
import { getWatchlist, isInWatchlist } from '../services/watchlistService'
import type { WatchlistShow } from '../services/watchlistService'

export type { WatchlistShow }

export function useWatchlist(uid: string | undefined) {
  const [items, setItems] = useState<WatchlistShow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const wl = await getWatchlist(uid)
    setItems(wl)
    setLoading(false)
  }, [uid])

  useEffect(() => { refresh() }, [refresh])

  return { items, loading, refresh }
}

export function useWatchlistStatus(uid: string | undefined, showTvTimeId: number | undefined) {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !showTvTimeId) return
    isInWatchlist(uid, showTvTimeId).then(v => { setInWatchlist(v); setLoading(false) })
  }, [uid, showTvTimeId])

  return { inWatchlist, loading, setInWatchlist }
}
