import { useEffect, useState, useCallback } from 'react'
import { getFollowedActiveShows, getBingingShows } from '../services/showService'
import { getCached, setCached } from '../lib/hook-cache'
import type { DashItem, BingingItem } from '../services/showService'

export type { DashItem, BingingItem }

export function useFollowedShows(uid: string | undefined) {
  const cacheKey = `followed:${uid}`
  const cached = getCached<{ shows: DashItem[]; binging: BingingItem[] }>(cacheKey)

  const [shows, setShows] = useState<DashItem[]>(cached?.shows ?? [])
  const [binging, setBinging] = useState<BingingItem[]>(cached?.binging ?? [])
  const [loading, setLoading] = useState(!cached)

  const fetchShows = useCallback(async (setLoadingState?: boolean) => {
    if (!uid) return
    if (setLoadingState && !getCached(cacheKey)) setLoading(true)
    const [followed, bingingResult] = await Promise.all([
      getFollowedActiveShows(uid),
      getBingingShows(uid).catch(() => []),
    ])
    setShows(followed)
    setBinging(bingingResult)
    setCached(cacheKey, { shows: followed, binging: bingingResult })
    if (setLoadingState) setLoading(false)
  }, [uid, cacheKey])

  useEffect(() => { fetchShows(true) }, [fetchShows])

  return { shows, binging, loading, refresh: () => fetchShows() }
}
