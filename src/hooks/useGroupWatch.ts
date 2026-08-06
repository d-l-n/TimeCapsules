import { useEffect, useMemo, useState } from 'react'
import { getGroupMembers, getGroupEpisodeProgress, listenToGroupWatchEvents, getGroupShows } from '../services/groupService'
import { toggleWatchedEpisode } from '../services/showService'
import { MEMBER_COLORS } from '../components/show-detail/types'
import type { ShowDoc, GroupWatchEventDoc } from '../lib/firebase-queries'
import type { GroupEpisodeProgress, MemberWithProfile, GroupWithMeta } from '../services/groupService'
import type { MergedEpisode } from '../components/show-detail/types'

interface UseGroupWatchArgs {
  id: string | undefined
  uid: string | undefined
  show: ShowDoc | null
  groups: GroupWithMeta[]
  selectedGroupId: string | null
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>
  watchedCountsRef: React.MutableRefObject<Map<number, number>>
  setWatchedCounts: React.Dispatch<React.SetStateAction<Map<number, number>>>
  mergedEpisodes: MergedEpisode[]
  grouped: Record<number, MergedEpisode[]>
}

/**
 * Group watch state: which group is selected, per-member episode progress,
 * the live watch-event feed and the auto-mark-as-watched listener.
 */
export function useGroupWatch({
  id, uid, show, groups, selectedGroupId, setSelectedGroupId,
  watchedCountsRef, setWatchedCounts, mergedEpisodes, grouped,
}: UseGroupWatchArgs) {
  const [groupProgress, setGroupProgress] = useState<GroupEpisodeProgress[]>([])
  const [groupMembers, setGroupMembers] = useState<MemberWithProfile[]>([])
  const [groupWatchFeed, setGroupWatchFeed] = useState<GroupWatchEventDoc[]>([])
  const [groupWatchToast, setGroupWatchToast] = useState<GroupWatchEventDoc | null>(null)
  const [showsInGroups, setShowsInGroups] = useState<Set<string>>(new Set())
  const [sortByProgress, setSortByProgress] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSortByProgress(new Set())
  }, [selectedGroupId])

  // Check which groups already have this show
  useEffect(() => {
    if (!show?.tmdb_id || groups.length === 0) { setShowsInGroups(new Set()); return }
    ;(async () => {
      const results = await Promise.allSettled(groups.map(g => getGroupShows(g.id)))
      const inGroups = new Set<string>()
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value.some(s => s.show_id === show.tmdb_id)) {
          inGroups.add(groups[i].id)
        }
      })
      setShowsInGroups(inGroups)
    })()
  }, [show?.tmdb_id, groups])

  useEffect(() => {
    if (!selectedGroupId || !show?.tmdb_id) { setGroupProgress([]); return }
    ;(async () => {
      const [progress, members] = await Promise.all([
        getGroupEpisodeProgress(selectedGroupId, show.tmdb_id),
        getGroupMembers(selectedGroupId),
      ])
      setGroupProgress(progress)
      setGroupMembers(members)
    })()
  }, [selectedGroupId, show?.tmdb_id])

  useEffect(() => {
    if (!selectedGroupId || !uid || !id) return
    const showId = parseInt(id)
    const unsub = listenToGroupWatchEvents(selectedGroupId, async (event) => {
      if (event.marked_by === uid) return
      if (event.show_id !== showId) return

      // Add to feed
      setGroupWatchFeed(prev => [event, ...prev].slice(0, 20))

      // Show toast
      setGroupWatchToast(event)
      setTimeout(() => setGroupWatchToast(null), 4000)

      // Auto-mark as watched if not already watched
      if (watchedCountsRef.current.has(event.episode_id)) return
      await toggleWatchedEpisode(uid, event.episode_id, showId, true, true)
      setWatchedCounts(prev => {
        if (prev.has(event.episode_id)) return prev
        const next = new Map(prev)
        next.set(event.episode_id, 1)
        return next
      })
    })
    return () => unsub()
  }, [selectedGroupId, uid, id, watchedCountsRef, setWatchedCounts])

  const memberColorMap = useMemo(() => {
    const map = new Map<string, string>()
    groupMembers.forEach((m, i) => map.set(m.user_id, MEMBER_COLORS[i % MEMBER_COLORS.length]))
    return map
  }, [groupMembers])

  const memberSeasonProgress = useMemo(() => {
    if (!selectedGroupId || groupMembers.length === 0) {
      const emptyCounts = new Map<string, Map<number, number>>()
      const emptyTotals = new Map<number, number>()
      return { counts: emptyCounts, totals: emptyTotals }
    }
    const totals = new Map<number, number>()
    Object.entries(grouped).forEach(([season, eps]) => totals.set(Number(season), eps.length))
    const counts = new Map<string, Map<number, number>>()
    groupMembers.forEach(m => {
      const seasonCounts = new Map<number, number>()
      totals.forEach((_, season) => seasonCounts.set(season, 0))
      counts.set(m.user_id, seasonCounts)
    })
    mergedEpisodes.forEach(ep => {
      const progress = groupProgress.find(p => p.episode_id === ep.id)
      if (progress) {
        progress.user_ids.forEach(muid => {
          if (counts.has(muid)) {
            const sc = counts.get(muid)!
            sc.set(ep.season_number, (sc.get(ep.season_number) || 0) + 1)
          }
        })
      }
    })
    return { counts, totals }
  }, [selectedGroupId, groupMembers, grouped, groupProgress, mergedEpisodes])

  return {
    selectedGroupId, setSelectedGroupId,
    groupProgress, groupMembers, groupWatchFeed, groupWatchToast,
    showsInGroups, setShowsInGroups, sortByProgress, setSortByProgress,
    memberColorMap, memberSeasonProgress,
  }
}
