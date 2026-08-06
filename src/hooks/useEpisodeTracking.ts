import { useCallback, useEffect, useRef, useState } from 'react'
import { toggleWatchedEpisode, removeWatchedEpisode, batchUpdateStats, ensureEpisode } from '../services/showService'
import { applyWatchedBatch } from '../services/episodeBatch'
import { createGroupWatchEvent } from '../services/groupService'
import { playWatchSound, playUnwatchSound, playCelebrationSound } from '../lib/sound'
import { triggerConfetti } from '../lib/confetti'
import { useI18n } from '../lib/I18nContext'
import type { ShowDoc } from '../lib/firebase-queries'
import type { MergedEpisode } from '../components/show-detail/types'

export interface CatchUpPrompt {
  episodeId: number
  prevIds: number[]
  hasPrevSeasons: boolean
  seasonEpisodeIds?: number[]
}

export interface ConfirmSeasonPrompt {
  seasonNumber: number
  episodeIds: number[]
  action: 'watch' | 'unwatch'
  laterEpisodeIds?: number[]
}

interface UseEpisodeTrackingArgs {
  uid: string | undefined
  id: string | undefined
  show: ShowDoc | null
  isMovie: boolean
  watchedCounts: Map<number, number>
  setWatchedCounts: React.Dispatch<React.SetStateAction<Map<number, number>>>
  mergedEpisodes: MergedEpisode[]
  grouped: Record<number, MergedEpisode[]>
  selectedGroupId: string | null
}

/**
 * Owns the per-episode state machine: toggling watched, catch-up prompt,
 * mark-season flows, rewatch, movie toggle and all the toasts/confetti/sound
 * feedback that goes with them.
 */
export function useEpisodeTracking({
  uid, id, show, isMovie, watchedCounts, setWatchedCounts,
  mergedEpisodes, grouped, selectedGroupId,
}: UseEpisodeTrackingArgs) {
  const { t } = useI18n()
  const [toggling, setToggling] = useState<number | null>(null)
  const [markingSeason, setMarkingSeason] = useState<number | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; context: 'catchUp' | 'season' } | null>(null)
  const [catchUpPrompt, setCatchUpPrompt] = useState<CatchUpPrompt | null>(null)
  const [confirmSeason, setConfirmSeason] = useState<ConfirmSeasonPrompt | null>(null)
  const [expandedSynopsis, setExpandedSynopsis] = useState<Set<number>>(new Set())
  const [feedbackEp, setFeedbackEp] = useState<{ id: number; watched: boolean; x: number; y: number } | null>(null)
  const [emotionPickerFor, setEmotionPickerFor] = useState<number | null>(null)
  const [episodeToast, setEpisodeToast] = useState<{ episodeNumber: number; seasonNumber: number; watched: boolean } | null>(null)
  const [seasonToast, setSeasonToast] = useState<{ seasonNumber: number; action: 'watch' | 'unwatch'; count: number } | null>(null)
  const [seriesToast, setSeriesToast] = useState<number | null>(null)
  const [movieToast, setMovieToast] = useState<{ watched: boolean; name: string } | null>(null)
  const [movieToggling, setMovieToggling] = useState(false)
  const togglingRef = useRef(false)
  const movieTogglingRef = useRef(false)
  const watchedCountsRef = useRef(watchedCounts)
  useEffect(() => { watchedCountsRef.current = watchedCounts }, [watchedCounts])

  const resolveEpisodeId = useCallback(async (episodeId: number): Promise<number> => {
    if (episodeId >= 0 || !show?.tmdb_id) return episodeId
    const ep = mergedEpisodes.find(e => e.id === episodeId)
    if (!ep) return Math.abs(episodeId)
    await ensureEpisode(Math.abs(episodeId), show.tmdb_id, ep.season_number, ep.episode_number, ep.title === `${t.showDetail.episode} ${ep.episode_number}` ? null : ep.title)
    return Math.abs(episodeId)
  }, [show?.tmdb_id, mergedEpisodes, t.showDetail.episode])

  const handleToggle = useCallback(async (episodeId: number, currentlyWatched: boolean, clientX?: number, clientY?: number) => {
    if (!uid || !id || toggling !== null || togglingRef.current) return

    if (!currentlyWatched) {
      const ep = mergedEpisodes.find(e => e.id === episodeId)
      if (ep) {
        const prevUnwatched = [...mergedEpisodes]
          .sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number)
          .filter(e =>
            (e.season_number < ep.season_number ||
             (e.season_number === ep.season_number && e.episode_number < ep.episode_number)) &&
            (watchedCounts.get(e.id) ?? 0) <= 0
          )

        if (prevUnwatched.length > 0) {
          const prevSeasons = new Set(prevUnwatched.map(e => e.season_number))
          const hasPrevSeasons = [...prevSeasons].some(s => s < ep.season_number)
          setCatchUpPrompt({
            episodeId: episodeId,
            prevIds: prevUnwatched.map(e => e.id),
            hasPrevSeasons,
          })
          return
        }
      }
    }

    setToggling(episodeId)
    togglingRef.current = true
    try {
      const realId = await resolveEpisodeId(episodeId)
      await toggleWatchedEpisode(uid, realId, parseInt(id), !currentlyWatched, true)
      if (!currentlyWatched && selectedGroupId) {
        await createGroupWatchEvent(selectedGroupId, realId, parseInt(id), uid)
      }
      setWatchedCounts(prev => {
        const next = new Map(prev)
        if (currentlyWatched) {
          next.delete(episodeId)
        } else {
          next.set(episodeId, 1)
        }
        return next
      })
      const watching = !currentlyWatched
      if (clientX !== undefined && clientY !== undefined) {
        setFeedbackEp({ id: episodeId, watched: watching, x: clientX, y: clientY })
        setTimeout(() => setFeedbackEp(null), 800)
      }
      if (watching) {
        playWatchSound()
      } else {
        playUnwatchSound()
      }
      const ep = mergedEpisodes.find(e => e.id === episodeId)
      if (ep) {
        setEpisodeToast({ episodeNumber: ep.episode_number, seasonNumber: ep.season_number, watched: watching })
        setTimeout(() => setEpisodeToast(null), 3000)
      }
      if (watching && ep) {
        const seasonEps = mergedEpisodes.filter(e => e.season_number === ep.season_number)
        const allWatched = seasonEps.every(e => {
          const alreadyWatched = (watchedCounts.get(e.id) ?? 0) > 0
          const justWatched = e.id === episodeId
          return alreadyWatched || justWatched
        })
        if (allWatched) triggerConfetti()
        const allSeriesWatched = mergedEpisodes.every(e => {
          const alreadyWatched = (watchedCounts.get(e.id) ?? 0) > 0
          const justWatched = e.id === episodeId
          return alreadyWatched || justWatched
        })
        if (allSeriesWatched) { triggerConfetti(260); playCelebrationSound(); setSeriesToast(episodeId); setTimeout(() => setSeriesToast(null), 4000) } else { setEmotionPickerFor(episodeId) }
      }
      // Auto-scroll to next unwatched episode after marking current as watched
      if (watching) {
        const currentIndex = mergedEpisodes.findIndex(e => e.id === episodeId)
        if (currentIndex !== -1) {
          const nextUnwatched = mergedEpisodes.slice(currentIndex + 1).find(e => (watchedCounts.get(e.id) ?? 0) <= 0)
          if (nextUnwatched) {
            setTimeout(() => {
              const el = document.querySelector(`[data-episode-id="${nextUnwatched.id}"]`)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 150)
          }
        }
      }
    } catch (e) { console.warn('showDetail action failed', e) }
    setToggling(null)
    togglingRef.current = false
  }, [uid, id, toggling, mergedEpisodes, watchedCounts, selectedGroupId, resolveEpisodeId, setWatchedCounts])

  const handleCatchUp = useCallback(async (markAll: boolean) => {
    const prompt = catchUpPrompt
    if (!prompt || !uid || !id) return
    setCatchUpPrompt(null)

    const idsToWatch = markAll ? [...prompt.prevIds, prompt.episodeId] : (prompt.seasonEpisodeIds ?? [prompt.episodeId])
    const showId = parseInt(id)

    setBatchProgress({ current: 0, total: idsToWatch.length, context: 'catchUp' })
    setToggling(prompt.episodeId)
    togglingRef.current = true
    try {
      const realIds = await Promise.all(idsToWatch.map(eid => resolveEpisodeId(eid)))
      // Parallel Firestore writes — no existence query, no per-item stats
      await applyWatchedBatch(uid, showId, realIds, selectedGroupId)
      setBatchProgress({ current: realIds.length, total: realIds.length, context: 'catchUp' })
      setWatchedCounts(prev => {
        const next = new Map(prev)
        idsToWatch.forEach(eid => {
          if (!next.has(eid)) next.set(eid, 1)
        })
        return next
      })
      playWatchSound()
      setSeasonToast({ seasonNumber: 0, action: 'watch', count: idsToWatch.length })
      setTimeout(() => setSeasonToast(null), 3000)
      const newlyWatched = new Set(idsToWatch)
      for (const seasonEps of Object.values(grouped)) {
        const allWatched = seasonEps.every(e => {
          const alreadyWatched = (watchedCounts.get(e.id) ?? 0) > 0
          const justWatched = newlyWatched.has(e.id)
          return alreadyWatched || justWatched
        })
        if (allWatched) { triggerConfetti(); break }
      }
      const allSeriesWatched = mergedEpisodes.every(e => {
        const alreadyWatched = (watchedCounts.get(e.id) ?? 0) > 0
        const justWatched = newlyWatched.has(e.id)
        return alreadyWatched || justWatched
      })
      if (allSeriesWatched) { triggerConfetti(260); playCelebrationSound(); setSeriesToast(prompt.episodeId); setTimeout(() => setSeriesToast(null), 4000) } else { setEmotionPickerFor(prompt.episodeId) }
    } catch (e) { console.warn('showDetail action failed', e) }
    setBatchProgress(null)
    setToggling(null)
    togglingRef.current = false
  }, [catchUpPrompt, uid, id, selectedGroupId, resolveEpisodeId, grouped, watchedCounts, mergedEpisodes, setWatchedCounts])

  const handleToggleSynopsis = useCallback((episodeId: number) => {
    setExpandedSynopsis(prev => {
      const next = new Set(prev)
      if (next.has(episodeId)) next.delete(episodeId)
      else next.add(episodeId)
      return next
    })
  }, [])

  const handleRewatch = useCallback(async (episodeId: number) => {
    if (!uid || !id || toggling !== null) return
    setToggling(episodeId)
    try {
      const realId = await resolveEpisodeId(episodeId)
      await toggleWatchedEpisode(uid, realId, parseInt(id), true)
      setWatchedCounts(prev => {
        const next = new Map(prev)
        next.set(episodeId, (next.get(episodeId) ?? 1) + 1)
        return next
      })
      if (selectedGroupId) {
        await createGroupWatchEvent(selectedGroupId, episodeId, parseInt(id), uid)
      }
      playWatchSound()
      const ep = mergedEpisodes.find(e => e.id === episodeId)
      if (ep) {
        setEpisodeToast({ episodeNumber: ep.episode_number, seasonNumber: ep.season_number, watched: true })
        setTimeout(() => setEpisodeToast(null), 3000)
      }
    } catch (e) { console.warn('showDetail action failed', e) }
    setToggling(null)
  }, [uid, id, toggling, selectedGroupId, mergedEpisodes, resolveEpisodeId, setWatchedCounts])

  const handleMarkSeasonWatched = useCallback(async (seasonNumber: number, episodeIds: number[]) => {
    if (!uid || !id || markingSeason !== null) return
    const unwatchedIds = episodeIds.filter(eid => (watchedCounts.get(eid) ?? 0) <= 0)
    if (unwatchedIds.length === 0) return

    const prevUnwatched = [...mergedEpisodes]
      .sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number)
      .filter(e =>
        e.season_number < seasonNumber &&
        (watchedCounts.get(e.id) ?? 0) <= 0
      )

    if (prevUnwatched.length > 0) {
      const lastEpId = unwatchedIds[unwatchedIds.length - 1]
      setCatchUpPrompt({
        episodeId: lastEpId,
        prevIds: [...prevUnwatched.map(e => e.id), ...unwatchedIds.slice(0, -1)],
        hasPrevSeasons: true,
        seasonEpisodeIds: unwatchedIds,
      })
      return
    }

    setConfirmSeason({ seasonNumber, episodeIds: unwatchedIds, action: 'watch' })
  }, [uid, id, markingSeason, watchedCounts, mergedEpisodes])

  const handleMarkSeasonUnwatched = useCallback(async (seasonNumber: number, episodeIds: number[]) => {
    if (!uid || !id || markingSeason !== null) return
    const watchedIds = episodeIds.filter(eid => (watchedCounts.get(eid) ?? 0) > 0)
    if (watchedIds.length === 0) return

    const laterWatched = mergedEpisodes
      .filter(e => e.season_number > seasonNumber && (watchedCounts.get(e.id) ?? 0) > 0)
    const laterIds = laterWatched.map(e => e.id)
    if (laterIds.length > 0) {
      setConfirmSeason({ seasonNumber, episodeIds: watchedIds, action: 'unwatch', laterEpisodeIds: laterIds })
    } else {
      setConfirmSeason({ seasonNumber, episodeIds: watchedIds, action: 'unwatch' })
    }
  }, [uid, id, markingSeason, watchedCounts, mergedEpisodes])

  const handleConfirmSeason = useCallback(async (includeLater?: boolean) => {
    const cs = confirmSeason
    if (!cs || !uid || !id || markingSeason !== null) return
    setConfirmSeason(null)
    setMarkingSeason(cs.seasonNumber)
    try {
      const watched = cs.action === 'watch'
      const showId = parseInt(id)
      const allIds = includeLater && cs.laterEpisodeIds
        ? [...cs.episodeIds, ...cs.laterEpisodeIds]
        : cs.episodeIds
      const realIds = await Promise.all(allIds.map(eid => resolveEpisodeId(eid)))
      const lastEpId = allIds[allIds.length - 1]
      setBatchProgress({ current: 0, total: realIds.length, context: 'season' })
      // Parallel Firestore writes — blind add/delete, no per-item stats
      if (watched) {
        await applyWatchedBatch(uid, showId, realIds, selectedGroupId)
      } else {
        const removedCounts = await Promise.all(realIds.map(realId => removeWatchedEpisode(uid, realId)))
        const totalRemoved = removedCounts.reduce((a, b) => a + b, 0)
        if (totalRemoved > 0) await batchUpdateStats(uid, -totalRemoved)
      }
      setBatchProgress({ current: realIds.length, total: realIds.length, context: 'season' })
      setWatchedCounts(prev => {
        const next = new Map(prev)
        allIds.forEach(eid => watched ? next.set(eid, 1) : next.delete(eid))
        return next
      })
      if (watched) playWatchSound()
      else playUnwatchSound()
      setSeasonToast({ seasonNumber: cs.seasonNumber, action: cs.action, count: allIds.length })
      setTimeout(() => setSeasonToast(null), 3000)
      if (watched) {
        const seasonEps = mergedEpisodes.filter(e => e.season_number === cs.seasonNumber)
        const allWatched = seasonEps.every(e => {
          const alreadyWatched = (watchedCounts.get(e.id) ?? 0) > 0
          const justWatched = cs.episodeIds.includes(e.id)
          return alreadyWatched || justWatched
        })
        if (allWatched) triggerConfetti()
        const allSeriesWatched = mergedEpisodes.every(e => {
          const alreadyWatched = (watchedCounts.get(e.id) ?? 0) > 0
          const justWatched = cs.episodeIds.includes(e.id)
          return alreadyWatched || justWatched
        })
        if (allSeriesWatched) { triggerConfetti(260); playCelebrationSound(); setSeriesToast(lastEpId); setTimeout(() => setSeriesToast(null), 4000) } else { setEmotionPickerFor(lastEpId) }
      }
    } catch (e) { console.warn('showDetail action failed', e) }
    setBatchProgress(null)
    setMarkingSeason(null)
  }, [confirmSeason, uid, id, markingSeason, selectedGroupId, resolveEpisodeId, mergedEpisodes, watchedCounts, setWatchedCounts])

  const handleCancelSeason = useCallback(() => setConfirmSeason(null), [])

  const handleMovieToggle = useCallback(async () => {
    if (!uid || movieToggling || movieTogglingRef.current) return
    movieTogglingRef.current = true
    const showId = show?.tmdb_id
    if (!showId) { movieTogglingRef.current = false; return }
    setMovieToggling(true)
    try {
      const isCurrentlyWatched = isMovie && (watchedCounts.get(showId) ?? 0) > 0
      await toggleWatchedEpisode(uid, showId, showId, !isCurrentlyWatched, true)
      if (!isCurrentlyWatched && selectedGroupId) {
        await createGroupWatchEvent(selectedGroupId, showId, showId, uid)
      }
      setWatchedCounts(prev => {
        const next = new Map(prev)
        if (isCurrentlyWatched) next.delete(showId)
        else next.set(showId, 1)
        return next
      })
      if (!isCurrentlyWatched) playWatchSound()
      else playUnwatchSound()
      setMovieToast({ watched: !isCurrentlyWatched, name: show?.name || '' })
      setTimeout(() => setMovieToast(null), 3000)
    } catch (e) { console.warn('showDetail action failed', e) }
    setMovieToggling(false)
    movieTogglingRef.current = false
  }, [uid, movieToggling, show, isMovie, watchedCounts, selectedGroupId, setWatchedCounts])

  return {
    watchedCountsRef,
    toggling, markingSeason, batchProgress,
    catchUpPrompt, setCatchUpPrompt, confirmSeason,
    expandedSynopsis, feedbackEp, emotionPickerFor, setEmotionPickerFor,
    episodeToast, setEpisodeToast, seasonToast, setSeasonToast,
    seriesToast, setSeriesToast, movieToast, movieToggling,
    handleToggle, handleCatchUp, handleToggleSynopsis, handleRewatch,
    handleMarkSeasonWatched, handleMarkSeasonUnwatched,
    handleConfirmSeason, handleCancelSeason, handleMovieToggle,
  }
}
