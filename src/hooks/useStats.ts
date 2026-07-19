import { useEffect, useState, useCallback } from 'react'
import { getUserStats, getRatingDistribution, getShowCount, getBadges, getStreak, BADGE_NAMES } from '../services/statsService'
import type { RatingDistItem } from '../services/statsService'
import type { UserStatsDoc, BadgeDoc } from '../lib/firebase-queries'

export type { RatingDistItem }
export { BADGE_NAMES }

export function useStats(uid: string | undefined) {
  const [stats, setStats] = useState<Partial<UserStatsDoc>>({})
  const [ratingDist, setRatingDist] = useState<RatingDistItem[]>([])
  const [showCount, setShowCount] = useState(0)
  const [badges, setBadges] = useState<BadgeDoc[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async (setLoadingState?: boolean) => {
    if (!uid) return
    if (setLoadingState) setLoading(true)
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
    if (setLoadingState) setLoading(false)
  }, [uid])

  useEffect(() => { fetchStats(true) }, [fetchStats])

  return { stats, ratingDist, showCount, badges, streak, loading, refresh: () => fetchStats(), BADGE_NAMES }
}
