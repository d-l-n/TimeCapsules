import { useEffect, useState, useCallback } from 'react'
import { getUserStats, getRatingDistribution, getShowCount, getBadges, getStreak, BADGE_NAMES } from '../services/statsService'
import { getCached, setCached } from '../lib/hook-cache'
import type { RatingDistItem } from '../services/statsService'
import type { UserStatsDoc, BadgeDoc } from '../lib/firebase-queries'

export type { RatingDistItem }
export { BADGE_NAMES }

interface StatsCache {
  stats: Partial<UserStatsDoc>
  ratingDist: RatingDistItem[]
  showCount: number
  badges: BadgeDoc[]
  streak: number
}

export function useStats(uid: string | undefined) {
  const cacheKey = `stats:${uid}`
  const cached = getCached<StatsCache>(cacheKey)

  const [stats, setStats] = useState<Partial<UserStatsDoc>>(cached?.stats ?? {})
  const [ratingDist, setRatingDist] = useState<RatingDistItem[]>(cached?.ratingDist ?? [])
  const [showCount, setShowCount] = useState(cached?.showCount ?? 0)
  const [badges, setBadges] = useState<BadgeDoc[]>(cached?.badges ?? [])
  const [streak, setStreak] = useState(cached?.streak ?? 0)
  const [loading, setLoading] = useState(!cached)

  const fetchStats = useCallback(async (setLoadingState?: boolean) => {
    if (!uid) return
    if (setLoadingState && !cached) setLoading(true)
    const [userStats, dist, count, userBadges, s] = await Promise.all([
      getUserStats(uid),
      getRatingDistribution(uid),
      getShowCount(uid),
      getBadges(uid),
      getStreak(uid),
    ])
    setStats(userStats)
    setRatingDist(dist)
    setShowCount(count)
    setBadges(userBadges)
    setStreak(s)
    setCached(cacheKey, { stats: userStats, ratingDist: dist, showCount: count, badges: userBadges, streak: s })
    if (setLoadingState) setLoading(false)
  }, [uid, cacheKey, cached])

  useEffect(() => { if (!cached) fetchStats(true) }, [fetchStats, cached])

  return { stats, ratingDist, showCount, badges, streak, loading, refresh: () => fetchStats(), BADGE_NAMES }
}
