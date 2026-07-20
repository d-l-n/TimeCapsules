import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getShowById, getEpisodesByShow, getRatingForShow, getWatchedEpisodesForShow, toggleWatchedEpisode, getResumePositions, setResumePosition, getShowByTmdbId, createShowFromTmdb, addFollowedShow, ensureEpisode } from '../services/showService'
import type { ShowDoc, EpisodeDoc, RatingDoc } from '../lib/firebase-queries'
import { getTmdbDetails, getTmdbDetailsAuto, getTmdbAllEpisodes, getWatchProviders, getTmdbCollection, getSimilar, getRecommended, tmdbLang } from '../services/tmdb'
import type { WatchProvidersResult, TmdbSeasonEpisode, TmdbCollectionPart, TmdbCollectionInfo, TmdbSearchResult, TmdbDetails } from '../services/tmdb'
import { useI18n } from '../lib/I18nContext'
import { useAuth } from '../lib/AuthContext'
import { useGroups, useWatchlistStatus, useSpoilerFree } from '../hooks'
import { getGroupMembers, getGroupEpisodeProgress, createGroupWatchEvent, listenToGroupWatchEvents } from '../services/groupService'
import { addToWatchlist, removeFromWatchlist } from '../services/watchlistService'
import { getUserLists, addShowToList, removeShowFromList, getListDisplayName } from '../services/listService'
import type { CustomListDoc } from '../lib/firebase-queries'
import type { GroupEpisodeProgress, MemberWithProfile } from '../services/groupService'
import type { GroupWatchEventDoc } from '../lib/firebase-queries'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import EmotionPicker from '../components/EmotionPicker'
import { getEmotionsForShow } from '../services/emotionService'
import { Skeleton } from 'boneyard-js/react'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import MediaGrid from '../components/show-detail/MediaGrid'
import CatchUpModal from '../components/show-detail/CatchUpModal'
import ConfirmSeasonModal from '../components/show-detail/ConfirmSeasonModal'
import StreamProviders from '../components/show-detail/StreamProviders'
import CollectionGrid from '../components/show-detail/CollectionGrid'
import SeasonSection from '../components/show-detail/SeasonSection'
import RatingPicker from '../components/show-detail/RatingPicker'
import PositionEditor from '../components/show-detail/PositionEditor'
import { MEMBER_COLORS, fmtPos } from '../components/show-detail/types'

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const [show, setShow] = useState<ShowDoc | null>(null)
  const [rating, setRating] = useState<RatingDoc | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [watchedCounts, setWatchedCounts] = useState<Map<number, number>>(new Map())
  const [providers, setProviders] = useState<WatchProvidersResult | null>(null)
  const [tmdbEpisodes, setTmdbEpisodes] = useState<TmdbSeasonEpisode[]>([])
  const [tmdbOverview, setTmdbOverview] = useState<string | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const [expandedSynopsis, setExpandedSynopsis] = useState<Set<number>>(new Set())
  const avgRuntime = useMemo(() => {
    if (!show?.episode_run_time?.length) return 0
    const r = show.episode_run_time.filter(t => t > 0)
    return r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : 0
  }, [show?.episode_run_time])
  const remainingDuration = useMemo(() => {
    if (avgRuntime === 0) return null
    const unwatched = episodes.filter(e => (watchedCounts.get(e.tmdb_id) ?? 0) <= 0).length
    const minutes = unwatched * avgRuntime
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }, [avgRuntime, episodes, watchedCounts])
  const [markingSeason, setMarkingSeason] = useState<number | null>(null)
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<number>>(new Set())
  const [isMovie, setIsMovie] = useState(false)
  const [collection, setCollection] = useState<TmdbCollectionInfo | null>(null)
  const [collectionParts, setCollectionParts] = useState<TmdbCollectionPart[]>([])
  const [similar, setSimilar] = useState<TmdbSearchResult[]>([])
  const [recommended, setRecommended] = useState<TmdbSearchResult[]>([])
  const [simAdded, setSimAdded] = useState<Map<number, boolean>>(new Map())
  const [simAdding, setSimAdding] = useState<number | null>(null)
  const [streamCountry, setStreamCountry] = useState(() => localStorage.getItem('streamCountry') || 'AR')
  const [catchUpPrompt, setCatchUpPrompt] = useState<{ episodeId: number; prevIds: number[]; hasPrevSeasons: boolean; seasonEpisodeIds?: number[] } | null>(null)
  const [showSimilar, setShowSimilar] = useState(false)
  const [showRecommended, setShowRecommended] = useState(false)
  const [showGroupFeed, setShowGroupFeed] = useState(false)
  const [resumePositions, setResumePositions] = useState<Map<number, number>>(new Map())
  const [editingPosition, setEditingPosition] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [feedbackEp, setFeedbackEp] = useState<{ id: number; watched: boolean; x: number; y: number } | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const togglingRef = useRef(false)
  const { groups } = useGroups(user?.uid)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupProgress, setGroupProgress] = useState<GroupEpisodeProgress[]>([])
  const [groupMembers, setGroupMembers] = useState<MemberWithProfile[]>([])
  const { inWatchlist, loading: wlLoading, setInWatchlist } = useWatchlistStatus(user?.uid, show?.tmdb_id)
  const [spoilerFree] = useSpoilerFree()
  const [userLists, setUserLists] = useState<CustomListDoc[]>([])
  const [showListPicker, setShowListPicker] = useState(false)
  const [showInLists, setShowInLists] = useState<Set<string>>(new Set())
  const [emotions, setEmotions] = useState<Map<number, string>>(new Map())
  const [emotionPickerFor, setEmotionPickerFor] = useState<number | null>(null)
  const [showRatingPicker, setShowRatingPicker] = useState(false)
  const [confirmSeason, setConfirmSeason] = useState<{ seasonNumber: number; episodeIds: number[]; action: 'watch' | 'unwatch' } | null>(null)
  const [groupWatchFeed, setGroupWatchFeed] = useState<GroupWatchEventDoc[]>([])
  const [groupWatchToast, setGroupWatchToast] = useState<GroupWatchEventDoc | null>(null)
  const [movieRuntime, setMovieRuntime] = useState<number | null>(null)
  const [sortByProgress, setSortByProgress] = useState<Set<number>>(new Set())
  const watchedCountsRef = useRef(watchedCounts)
  useEffect(() => { watchedCountsRef.current = watchedCounts }, [watchedCounts])

  const handleStreamCountryChange = useCallback((country: string) => {
    setStreamCountry(country)
    localStorage.setItem('streamCountry', country)
  }, [])

  const handleSimilarAdd = useCallback(async (item: TmdbSearchResult) => {
    if (!user?.uid || simAdding) return
    setSimAdding(item.id)
    try {
      const existing = await getShowByTmdbId(item.id)
      const tvTimeId = existing ? existing.data.tmdb_id : await createShowFromTmdb(
        item.id, item.name || item.title || 'Unknown',
        item.poster_path, item.backdrop_path, item.overview,
        item.media_type as 'movie' | 'tv' | undefined
      )
      await addFollowedShow(user.uid, tvTimeId)
      setSimAdded(m => new Map(m).set(item.id, true))
    } catch {}
    setSimAdding(null)
  }, [user?.uid, simAdding])

  const handleSimilarWatch = useCallback(async (item: TmdbSearchResult) => {
    if (!user?.uid || simAdding) return
    setSimAdding(item.id)
    try {
      const existing = await getShowByTmdbId(item.id)
      const tvTimeId = existing ? existing.data.tmdb_id : await createShowFromTmdb(
        item.id, item.name || item.title || 'Unknown',
        item.poster_path, item.backdrop_path, item.overview,
        'movie'
      )
      await toggleWatchedEpisode(user.uid, tvTimeId, tvTimeId, true)
      setSimAdded(m => new Map(m).set(item.id, true))
    } catch {}
    setSimAdding(null)
  }, [user?.uid, simAdding])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (!id || !user?.uid) return
    const tvTimeId = parseInt(id)
    let cancelled = false
    ;(async () => {
      try {
        let sh = await getShowById(tvTimeId)
        if (cancelled) return

        if (!sh && tvTimeId < 0) {
          const tmdbId = -tvTimeId
          const existing = await getShowByTmdbId(tmdbId)
          if (existing) {
            if (existing.data.tmdb_id !== tvTimeId) {
              if (!cancelled) {
                navigate(`/show/${existing.data.tmdb_id}`, { replace: true })
              }
              return
            }
            sh = existing.data
          } else {
            let details = await getTmdbDetails(tmdbId, 'tv', tmdbLang(lang))
            let mediaType: 'movie' | 'tv' = 'tv'
            if (!details) {
              details = await getTmdbDetails(tmdbId, 'movie', tmdbLang(lang))
              mediaType = 'movie'
            }
            if (details) {
              const name = details.title || details.name || 'Unknown'
              await createShowFromTmdb(
                tmdbId,
                name,
                details.poster_path,
                details.backdrop_path,
                details.overview,
                mediaType
              )
              sh = await getShowById(tvTimeId)
            }
          }
        }

        if (cancelled) return
        if (!sh) {
          setLoading(false)
          return
        }

        setShow(sh)

        const [eps, ra, watchedCountsData, resume, emo] = await Promise.all([
          getEpisodesByShow(sh.tmdb_id),
          getRatingForShow(user.uid, sh.tmdb_id),
          getWatchedEpisodesForShow(user.uid, sh.tmdb_id),
          getResumePositions(user.uid, sh.tmdb_id),
          getEmotionsForShow(user.uid, sh.tmdb_id),
        ])
        if (cancelled) return

        setEpisodes(eps as EpisodeDoc[])
        setRating(ra as RatingDoc | null)
        setWatchedCounts(watchedCountsData)
        setResumePositions(resume)
        setEmotions(emo)
        if (user?.uid) {
          const lists = await getUserLists(user.uid)
          setUserLists(lists)
          setShowInLists(new Set(lists.filter(l => l.show_ids.includes(sh.tmdb_id)).map(l => l.id)))
        }

        if (sh.tmdb_id) {
          const mtCacheKey = `tmdb_mt_${sh.tmdb_id}`
          const badCacheKey = `tmdb_bad_${sh.tmdb_id}`
          const cachedType = localStorage.getItem(mtCacheKey)
          const knownBad = localStorage.getItem(badCacheKey)
          let mediaType: 'movie' | 'tv'
          let details: TmdbDetails | null = null

          if (knownBad) {
            mediaType = sh.media_type === 'movie' ? 'movie' : 'tv'
          } else if (cachedType === 'movie' || cachedType === 'tv') {
            mediaType = cachedType
            details = await getTmdbDetails(sh.tmdb_id, mediaType, tmdbLang(lang))
            if (!details) {
              const fallbackType = mediaType === 'movie' ? 'tv' : 'movie'
              const fallback = await getTmdbDetails(sh.tmdb_id, fallbackType, tmdbLang(lang))
              if (fallback) {
                mediaType = fallbackType
                details = fallback
                localStorage.setItem(mtCacheKey, fallbackType)
              } else {
                localStorage.setItem(badCacheKey, '1')
              }
            }
          } else {
            mediaType = sh.media_type === 'movie' ? 'movie' : 'tv'
            const auto = await getTmdbDetailsAuto(sh.tmdb_id, tmdbLang(lang))
            if (auto) {
              mediaType = auto.mediaType
              details = auto.details
              localStorage.setItem(mtCacheKey, auto.mediaType)
              if (auto.mediaType !== (sh.media_type === 'movie' ? 'movie' : 'tv')) {
                await setDoc(doc(db, 'shows', sh.tmdb_id.toString()), { media_type: auto.mediaType }, { merge: true })
              }
            } else {
              localStorage.setItem(badCacheKey, '1')
            }
          }
          const isMovieType = mediaType === 'movie'
          setIsMovie(isMovieType)
          if (details) {
            const [providersData, similarData, recommendedData] = await Promise.all([
              getWatchProviders(sh.tmdb_id, mediaType, streamCountry),
              getSimilar(sh.tmdb_id, mediaType, tmdbLang(lang)),
              getRecommended(sh.tmdb_id, mediaType, tmdbLang(lang)),
            ])
            if (cancelled) return
            setProviders(providersData)
            setSimilar(similarData)
            setRecommended(recommendedData)
            if (details.overview) setTmdbOverview(details.overview)
            if (!isMovieType && details && (details as any).episode_run_time?.length && sh && !sh.episode_run_time) {
              const runtimes = (details as any).episode_run_time as number[]
              await setDoc(doc(db, 'shows', sh.tmdb_id.toString()), { episode_run_time: runtimes }, { merge: true })
              setShow(prev => prev ? { ...prev, episode_run_time: runtimes } : prev)
            }
            if (isMovieType) {
              setMovieRuntime((details as any)?.runtime ?? null)
              if (details.belongs_to_collection) {
                setCollection(details.belongs_to_collection)
                const parts = await getTmdbCollection(details.belongs_to_collection.id, tmdbLang(lang))
                if (!cancelled) setCollectionParts(parts)
              }
            } else if (details.seasons) {
              const allEps = await getTmdbAllEpisodes(sh.tmdb_id, details.seasons, tmdbLang(lang))
              if (!cancelled) setTmdbEpisodes(allEps)
            }
          }
        }
      } catch {}
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, user?.uid, lang, streamCountry, navigate])

  useEffect(() => {
    setSortByProgress(new Set())
  }, [selectedGroupId])

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
    if (!selectedGroupId || !user?.uid || !id) return
    const showId = parseInt(id)
    const unsub = listenToGroupWatchEvents(selectedGroupId, async (event) => {
      if (event.marked_by === user.uid) return
      if (event.show_id !== showId) return

      // Add to feed
      setGroupWatchFeed(prev => [event, ...prev].slice(0, 20))

      // Show toast
      setGroupWatchToast(event)
      setTimeout(() => setGroupWatchToast(null), 4000)

      // Auto-mark as watched if not already watched
      if (watchedCountsRef.current.has(event.episode_id)) return
      await toggleWatchedEpisode(user.uid, event.episode_id, showId, true)
      setWatchedCounts(prev => {
        if (prev.has(event.episode_id)) return prev
        const next = new Map(prev)
        next.set(event.episode_id, 1)
        return next
      })
    })
    return () => unsub()
  }, [selectedGroupId, user?.uid, id])

  const episodesLookup = useMemo(() => {
    const map = new Map<string, EpisodeDoc>()
    episodes.forEach(ep => map.set(`${ep.season_number}-${ep.episode_number}`, ep))
    return map
  }, [episodes])

  const mergedEpisodes = useMemo(() => {
    if (tmdbEpisodes.length === 0) return episodes.filter(ep => ep.season_number !== 0).map(ep => ({
      id: ep.tmdb_id,
      season_number: ep.season_number,
      episode_number: ep.episode_number,
      title: ep.title || `${t.showDetail.episode} ${ep.episode_number}`,
      fromTmdb: false,
      overview: null,
      still_path: null,
      air_date: null,
    }))
    return tmdbEpisodes.map(tmdbEp => {
      const fsEp = episodesLookup.get(`${tmdbEp.season_number}-${tmdbEp.episode_number}`)
      return {
        id: fsEp ? fsEp.tmdb_id : -(tmdbEp.id),
        season_number: tmdbEp.season_number,
        episode_number: tmdbEp.episode_number,
        title: tmdbEp.name || `${t.showDetail.episode} ${tmdbEp.episode_number}`,
        fromTmdb: !fsEp,
        overview: tmdbEp.overview || null,
        still_path: tmdbEp.still_path,
        air_date: tmdbEp.air_date,
      }
    })
  }, [tmdbEpisodes, episodes, episodesLookup, t.showDetail.episode])

  const grouped = useMemo(() => mergedEpisodes.reduce<Record<number, typeof mergedEpisodes>>((acc, ep) => { if (!acc[ep.season_number]) acc[ep.season_number] = []; acc[ep.season_number].push(ep); return acc }, {}), [mergedEpisodes])

  const watchedCountsBySeason = useMemo(() => {
    const counts: Record<number, number> = {}
    mergedEpisodes.forEach(ep => { if ((watchedCounts.get(ep.id) ?? 0) > 0) counts[ep.season_number] = (counts[ep.season_number] || 0) + 1 })
    return counts
  }, [mergedEpisodes, watchedCounts])

  const hasTmdbData = tmdbEpisodes.length > 0
  const totalEpsCount = mergedEpisodes.length
  const watchedEpsCount = mergedEpisodes.filter(e => (watchedCounts.get(e.id) ?? 0) > 0).length
  const remainingCount = totalEpsCount - watchedEpsCount

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

  const [collapsePref, setCollapsePref] = useState(() => localStorage.getItem('collapsePreference') || 'first')

  useEffect(() => {
    const handleStorageChange = () => {
      setCollapsePref(localStorage.getItem('collapsePreference') || 'first')
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    if (!hasTmdbData || loading) return
    const seasons = Object.keys(grouped).map(Number).sort((a, b) => a - b)
    const fullyWatched = seasons.filter(s => (watchedCountsBySeason[s] || 0) === (grouped[s]?.length || 0))
    const allWatched = fullyWatched.length === seasons.length
    const collapsed = new Set(fullyWatched)
    if (allWatched && seasons.length > 0) {
      const keep = collapsePref === 'last' ? seasons[seasons.length - 1] : seasons[0]
      collapsed.delete(keep)
    }
    setCollapsedSeasons(collapsed)
  }, [hasTmdbData, loading, grouped, watchedCountsBySeason, collapsePref])

  const resolveEpisodeId = useCallback(async (episodeTvTimeId: number): Promise<number> => {
    if (episodeTvTimeId >= 0 || !show?.tmdb_id) return episodeTvTimeId
    const ep = mergedEpisodes.find(e => e.id === episodeTvTimeId)
    if (!ep) return Math.abs(episodeTvTimeId)
    await ensureEpisode(Math.abs(episodeTvTimeId), show.tmdb_id, ep.season_number, ep.episode_number, ep.title === `${t.showDetail.episode} ${ep.episode_number}` ? null : ep.title)
    return Math.abs(episodeTvTimeId)
  }, [show?.tmdb_id, mergedEpisodes, t.showDetail.episode])

  const handleToggle = useCallback(async (episodeTvTimeId: number, currentlyWatched: boolean, clientX?: number, clientY?: number) => {
    if (!user?.uid || !id || toggling !== null || togglingRef.current) return

    if (!currentlyWatched) {
      const ep = mergedEpisodes.find(e => e.id === episodeTvTimeId)
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
            episodeId: episodeTvTimeId,
            prevIds: prevUnwatched.map(e => e.id),
            hasPrevSeasons,
          })
          return
        }
      }
    }

    setToggling(episodeTvTimeId)
    togglingRef.current = true
    try {
      const realId = await resolveEpisodeId(episodeTvTimeId)
      await toggleWatchedEpisode(user.uid, realId, parseInt(id), !currentlyWatched)
      if (!currentlyWatched && selectedGroupId) {
        await createGroupWatchEvent(selectedGroupId, realId, parseInt(id), user.uid)
      }
      setWatchedCounts(prev => {
        const next = new Map(prev)
        if (currentlyWatched) {
          next.delete(episodeTvTimeId)
        } else {
          next.set(episodeTvTimeId, 1)
        }
        return next
      })
      if (clientX !== undefined && clientY !== undefined) {
        setFeedbackEp({ id: episodeTvTimeId, watched: !currentlyWatched, x: clientX, y: clientY })
        setTimeout(() => setFeedbackEp(null), 800)
      }
      if (!currentlyWatched) setEmotionPickerFor(episodeTvTimeId)
    } catch {}
    setToggling(null)
    togglingRef.current = false
  }, [user?.uid, id, toggling, mergedEpisodes, watchedCounts, selectedGroupId, resolveEpisodeId])

  const handleCatchUp = useCallback(async (markAll: boolean) => {
    const prompt = catchUpPrompt
    if (!prompt || !user?.uid || !id) return
    setCatchUpPrompt(null)

    const idsToWatch = markAll ? [...prompt.prevIds, prompt.episodeId] : (prompt.seasonEpisodeIds ?? [prompt.episodeId])
    setToggling(prompt.episodeId)
    togglingRef.current = true
    try {
      const showId = parseInt(id)
      const realIds = await Promise.all(idsToWatch.map(eid => resolveEpisodeId(eid)))
      await Promise.all(realIds.map(eid => toggleWatchedEpisode(user.uid, eid, showId, true)))
      if (selectedGroupId) {
        await Promise.all(realIds.map(eid => createGroupWatchEvent(selectedGroupId, eid, showId, user.uid)))
      }
      setWatchedCounts(prev => {
        const next = new Map(prev)
        idsToWatch.forEach(eid => {
          if (!next.has(eid)) next.set(eid, 1)
        })
        return next
      })
    } catch {}
    setToggling(null)
    togglingRef.current = false
  }, [catchUpPrompt, user?.uid, id, selectedGroupId, resolveEpisodeId])

  const handleToggleSynopsis = useCallback((episodeId: number) => {
    setExpandedSynopsis(prev => {
      const next = new Set(prev)
      if (next.has(episodeId)) next.delete(episodeId)
      else next.add(episodeId)
      return next
    })
  }, [])

  const handleRewatch = useCallback(async (episodeId: number) => {
    if (!user?.uid || !id || toggling !== null) return
    setToggling(episodeId)
    try {
      const realId = await resolveEpisodeId(episodeId)
      await toggleWatchedEpisode(user.uid, realId, parseInt(id), true)
      setWatchedCounts(prev => {
        const next = new Map(prev)
        next.set(episodeId, (next.get(episodeId) ?? 1) + 1)
        return next
      })
      if (selectedGroupId) {
        await createGroupWatchEvent(selectedGroupId, episodeId, parseInt(id), user.uid)
      }
    } catch {}
    setToggling(null)
  }, [user?.uid, id, toggling, selectedGroupId, resolveEpisodeId])

  const handleMarkSeasonWatched = useCallback(async (seasonNumber: number, episodeIds: number[]) => {
    if (!user?.uid || !id || markingSeason !== null) return
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
  }, [user?.uid, id, markingSeason, watchedCounts, mergedEpisodes])

  const handleMarkSeasonUnwatched = useCallback(async (seasonNumber: number, episodeIds: number[]) => {
    if (!user?.uid || !id || markingSeason !== null) return
    const watchedIds = episodeIds.filter(eid => (watchedCounts.get(eid) ?? 0) > 0)
    if (watchedIds.length === 0) return
    setConfirmSeason({ seasonNumber, episodeIds: watchedIds, action: 'unwatch' })
  }, [user?.uid, id, markingSeason, watchedCounts])

  const handleConfirmSeason = useCallback(async () => {
    const cs = confirmSeason
    if (!cs || !user?.uid || !id || markingSeason !== null) return
    setConfirmSeason(null)
    setMarkingSeason(cs.seasonNumber)
    try {
      const watched = cs.action === 'watch'
      const showId = parseInt(id)
      const realIds = await Promise.all(cs.episodeIds.map(eid => resolveEpisodeId(eid)))
      await Promise.all(realIds.map(eid => toggleWatchedEpisode(user.uid, eid, showId, watched)))
      if (watched && selectedGroupId) {
        await Promise.all(realIds.map(eid => createGroupWatchEvent(selectedGroupId, eid, showId, user.uid)))
      }
      setWatchedCounts(prev => {
        const next = new Map(prev)
        cs.episodeIds.forEach(eid => watched ? next.set(eid, 1) : next.delete(eid))
        return next
      })
    } catch {}
    setMarkingSeason(null)
  }, [confirmSeason, user?.uid, id, markingSeason, selectedGroupId, resolveEpisodeId])

  const handleCancelSeason = useCallback(() => setConfirmSeason(null), [])

  const handleToggleSeason = useCallback((seasonNum: number) => {
    setCollapsedSeasons(prev => {
      const next = new Set(prev)
      if (next.has(seasonNum)) next.delete(seasonNum)
      else next.add(seasonNum)
      return next
    })
  }, [])

  const handleMovieToggle = useCallback(async () => {
    if (!user?.uid) return
    const showId = show?.tmdb_id
    if (!showId) return
    const isCurrentlyWatched = isMovie && (watchedCounts.get(showId) ?? 0) > 0
    await toggleWatchedEpisode(user.uid, showId, showId, !isCurrentlyWatched)
    if (!isCurrentlyWatched && selectedGroupId) {
      await createGroupWatchEvent(selectedGroupId, showId, showId, user.uid)
    }
    setWatchedCounts(prev => {
      const next = new Map(prev)
      if (isCurrentlyWatched) next.delete(showId)
      else next.set(showId, 1)
      return next
    })
  }, [user?.uid, show?.tmdb_id, isMovie, watchedCounts, selectedGroupId])

  function parsePosition(input: string): number | null {
    const trimmed = input.trim()
    if (!trimmed) return null
    const parts = trimmed.split(':')
    if (parts.length === 1) {
      const n = parseInt(parts[0])
      return isNaN(n) ? null : n
    }
    if (parts.length === 2) {
      const m = parseInt(parts[0])
      const s = parseInt(parts[1])
      if (isNaN(m) || isNaN(s)) return null
      return m * 60 + s
    }
    if (parts.length === 3) {
      const h = parseInt(parts[0])
      const m = parseInt(parts[1])
      const s = parseInt(parts[2])
      if (isNaN(h) || isNaN(m) || isNaN(s)) return null
      return h * 3600 + m * 60 + s
    }
    return null
  }

  const handleResumeClick = useCallback((contentId: number, currentSeconds: number | undefined) => {
    setEditingPosition(contentId)
    setEditValue(currentSeconds !== undefined ? fmtPos(currentSeconds) : '')
    requestAnimationFrame(() => editInputRef.current?.focus())
  }, [])

  const editValueRef = useRef(editValue)
  editValueRef.current = editValue

  const handleResumeSave = useCallback(async (contentId: number, contentType: 'episode' | 'movie') => {
    if (!user?.uid || !show) return
    const trimmed = editValueRef.current.trim()
    if (!trimmed) { setEditingPosition(null); setEditValue(''); return }
    const seconds = parsePosition(trimmed)
    if (seconds === null) { setEditingPosition(null); setEditValue(''); return }
    setEditingPosition(null)
    setEditValue('')
    await setResumePosition(user.uid, contentId, show.tmdb_id, contentType, seconds)
    setResumePositions(prev => {
      const next = new Map(prev)
      next.set(contentId, seconds)
      return next
    })
  }, [user?.uid, show])

  const handlePresetPosition = useCallback(async (contentId: number, contentType: 'episode' | 'movie', seconds: number) => {
    if (!user?.uid || !show) return
    setEditValue(fmtPos(seconds))
    await setResumePosition(user.uid, contentId, show.tmdb_id, contentType, seconds)
    setResumePositions(prev => {
      const next = new Map(prev)
      next.set(contentId, seconds)
      return next
    })
  }, [user?.uid, show])

  const handleClearPosition = useCallback(async (contentId: number, contentType: 'episode' | 'movie') => {
    if (!user?.uid || !show) return
    setEditValue('')
    await setResumePosition(user.uid, contentId, show.tmdb_id, contentType, null)
    setResumePositions(prev => {
      const next = new Map(prev)
      next.delete(contentId)
      return next
    })
  }, [user?.uid, show])

  const handleResumeKeyDown = useCallback((e: React.KeyboardEvent, contentId: number, contentType: 'episode' | 'movie') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleResumeSave(contentId, contentType)
    }
    if (e.key === 'Escape') {
      setEditingPosition(null)
      setEditValue('')
    }
  }, [handleResumeSave])

  const backdrop = show?.backdrop_url ?? null
  const movieWatched = isMovie && show && (watchedCounts.get(show.tmdb_id) ?? 0) > 0

  return (
    <Skeleton name="show-detail" loading={loading} fallback={<Loading text={t.showDetail.loading} />} animate="pulse" transition={300}>
    {!show ? (
      <EmptyState title={t.showDetail.notFound}><button onClick={() => navigate(-1)} className="underline font-bold">{t.showDetail.back}</button></EmptyState>
    ) : (
    <div className="space-y-8">
      {backdrop && <div className="relative h-56 sm:h-72 overflow-hidden sm:border-[3px] sm:border-border -mx-4 sm:-mx-0"><img src={backdrop} alt="" aria-hidden="true" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)' }} /><div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" /><div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-bg to-transparent" /></div>}
      <div className="relative -mt-16 sm:-mt-24 mx-4 sm:mx-0 p-4 sm:p-6 bg-surface border-[3px] border-border shadow-brutal space-y-4 z-10">
        <button onClick={() => navigate(-1)} className="btn-brutal text-xs sm:text-sm w-full sm:w-auto" aria-label={`${t.showDetail.back}`}>&larr; {t.showDetail.back}</button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase bg-yellow">{isMovie ? t.discover.movie : t.discover.tv}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase leading-tight break-words font-heading">{show.name}</h1>
        {(tmdbOverview ?? show.synopsis) && <p className="text-sm leading-relaxed max-w-3xl">{tmdbOverview ?? show.synopsis}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          {user?.uid && (
            <div className="relative">
              <button
                onClick={() => setShowRatingPicker(prev => !prev)}
                className="btn-brutal text-xs sm:text-sm w-full sm:w-auto"
                aria-label={t.showDetail.yourRating}
              >
                {t.showDetail.yourRating}: <span className="text-pink">{rating?.rating ?? '?'}/10</span>
              </button>
              {showRatingPicker && (
                <RatingPicker
                  rating={rating}
                  showTmdbId={show.tmdb_id}
                  userUid={user.uid}
                  setRating={setRating}
                  onClose={() => setShowRatingPicker(false)}
                  t={t}
                />
              )}
            </div>
          )}
          {!spoilerFree && show.imdb_rating != null && <div className="border-[3px] border-border px-2 sm:px-3 py-1.5 sm:py-2 bg-surface font-bold text-xs sm:text-sm">{t.showDetail.imdb}: <span className="text-pink">{show.imdb_rating}</span>{show.imdb_votes != null && <span className="font-normal text-text-secondary ml-1">({show.imdb_votes.toLocaleString()} {t.showDetail.votes})</span>}</div>}
          {!wlLoading && user?.uid && show?.tmdb_id && (
            <button
              onClick={async () => {
                if (inWatchlist) { await removeFromWatchlist(user.uid, show.tmdb_id); setInWatchlist(false) }
                else { await addToWatchlist(user.uid, show.tmdb_id); setInWatchlist(true) }
              }}
              className={`btn-brutal text-xs sm:text-sm w-full sm:w-auto ${inWatchlist ? 'bg-yellow' : 'bg-surface'}`}
              aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {inWatchlist ? t.watchlist.added : t.watchlist.add}
            </button>
          )}
          {user?.uid && show?.tmdb_id && (
            <div className="relative">
              <button onClick={() => setShowListPicker(prev => !prev)} className="btn-brutal text-xs sm:text-sm w-full sm:w-auto">{t.lists.addToList}</button>
              {showListPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowListPicker(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-surface border-[3px] border-border z-20 min-w-48 max-h-60 overflow-y-auto shadow-brutal-md">
                  {userLists.length === 0 && <div className="px-3 py-2 text-xs text-text-secondary">{t.lists.noLists}</div>}
                      {userLists.map(list => {
                    const inList = showInLists.has(list.id)
                    return (
                      <button
                        key={list.id}
                        onClick={async () => {
                          if (inList) { await removeShowFromList(list.id, show.tmdb_id); setShowInLists(prev => { const n = new Set(prev); n.delete(list.id); return n }) }
                          else { await addShowToList(list.id, show.tmdb_id); setShowInLists(prev => { const n = new Set(prev); n.add(list.id); return n }) }
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold border-b-2 border-border last:border-b-0 hover:bg-yellow transition-colors cursor-pointer ${inList ? 'bg-yellow text-text' : ''}`}
                        aria-label={`${inList ? "Remove from" : "Add to"} list: ${getListDisplayName(list, lang)}`}
                      >
                        {getListDisplayName(list, lang)} {inList && 'OK'}
                      </button>
                    )
                  })}
                </div>
                </>
              )}
            </div>
          )}
          {isMovie && (
            <>
              <button
                onClick={handleMovieToggle}
                className={`btn-brutal text-xs sm:text-sm w-full sm:w-auto ${movieWatched ? 'bg-yellow' : 'bg-surface'}`}
                aria-label={movieWatched ? t.showDetail.watched : t.showDetail.markAsWatched}
              >
                {movieWatched ? t.showDetail.watched : t.showDetail.markAsWatched}
              </button>
              {editingPosition === show.tmdb_id ? (
                <PositionEditor
                  contentId={show.tmdb_id}
                  contentType="movie"
                  maxSeconds={movieRuntime ? movieRuntime * 60 : 7200}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  editInputRef={editInputRef}
                  currentSeconds={resumePositions.get(show.tmdb_id)}
                  onSave={handleResumeSave}
                  onPreset={handlePresetPosition}
                  onClear={handleClearPosition}
                  onKeyDown={handleResumeKeyDown}
                  t={t}
                />
              ) : (
                <button
                  onClick={() => handleResumeClick(show.tmdb_id, resumePositions.get(show.tmdb_id))}
                  className="border-2 border-border px-1.5 py-1 text-[10px] font-bold bg-surface text-text hover:bg-yellow transition-colors"
                  aria-label={t.showDetail.resumePosition}
                >
                  @ {resumePositions.has(show.tmdb_id) ? fmtPos(resumePositions.get(show.tmdb_id)!) : t.showDetail.noPosition}
                </button>
              )}
            </>
          )}
        </div>
        {providers && (
          <StreamProviders
            providers={providers}
            streamCountry={streamCountry}
            onCountryChange={handleStreamCountryChange}
            showName={show?.name || ''}
            t={t}
          />
        )}
      </div>
      {groups.length > 0 && (
        <div className="bg-surface border-[3px] border-border p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase text-text-secondary">{t.watchParty.watchingTogether}</span>
          <select
            value={selectedGroupId ?? ''}
            onChange={e => setSelectedGroupId(e.target.value || null)}
            className="border-2 border-border bg-surface text-xs font-bold px-2 py-1 uppercase cursor-pointer hover:bg-yellow transition-colors"
            aria-label={t.watchParty.selectGroup}
          >
            <option value="">{t.watchParty.justMe}</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {groupMembers.length > 1 && (
            <div className="flex gap-1">
              {groupMembers.map(m => {
                const name = m.user_id === user?.uid ? t.groups.you : (m.display_name || m.user_id.slice(0, 6))
                return (
                  <span
                    key={m.user_id}
                    className="w-5 h-5 border border-border inline-flex items-center justify-center text-[8px] font-bold bg-surface"
                    title={name}
                  >
                    {m.user_id === user?.uid ? '★' : (name[0]?.toUpperCase() || '●')}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
      {selectedGroupId && (
        <div className="bg-surface border-[3px] border-border p-3 space-y-2">
          <button
            onClick={() => setShowGroupFeed(prev => !prev)}
            className="w-full text-left cursor-pointer"
            aria-expanded={showGroupFeed}
            aria-label={t.watchParty.activity}
          >
            <h3 className="text-[10px] font-bold uppercase text-text-secondary border-b-2 border-border pb-1 flex items-center gap-1.5 hover:text-orange transition-colors">
              <span>{showGroupFeed ? '▼' : '▶'}</span>
              <span>{t.watchParty.activity}</span>
              {groupWatchFeed.length > 0 && <span className="border border-border px-1 text-[9px]">{groupWatchFeed.length}</span>}
            </h3>
          </button>
          {showGroupFeed && (
            groupWatchFeed.length === 0 ? (
              <div className="text-[10px] font-bold text-text-secondary">{t.watchParty.noActivity}</div>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {groupWatchFeed.slice(0, 10).map((ev, i) => {
                  const ep = mergedEpisodes.find(e => e.id === ev.episode_id)
                  const isYou = ev.marked_by === user?.uid
                  return (
                    <div key={`${ev.created_at}-${i}`} className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 border border-border ${isYou ? 'bg-yellow' : 'bg-pink'}`} />
                      <span className="text-text-secondary">{isYou ? t.groups.you : t.watchParty.aMember}</span>
                      <span>{t.watchParty.watchedEpisode.replace('{episode}', ep ? `${t.showDetail.episode} ${ep.episode_number}` : `#${ev.episode_id}`)}</span>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}
      {!isMovie && hasTmdbData && remainingCount > 0 && (
        <div className="bg-surface border-[3px] border-border p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase">{t.showDetail.remaining}</span>
            <span className="text-xs font-bold">{remainingCount} / {totalEpsCount}{remainingDuration && <span className="font-normal text-text-secondary ml-2">({remainingDuration})</span>}</span>
          </div>
          <div className="h-3 bg-surface-light border-2 border-border overflow-hidden">
            <div className="h-full bg-yellow progress-shimmer transition-all duration-500 ease-out" style={{ width: `${totalEpsCount ? ((totalEpsCount - remainingCount) / totalEpsCount) * 100 : 0}%` }} />
          </div>
        </div>
      )}
      {!isMovie && hasTmdbData && remainingCount === 0 && (
        <div className="bg-surface border-[3px] border-border p-3 text-xs font-bold text-center bg-green/30">{t.showDetail.allCaughtUp}</div>
      )}
      {isMovie && collection ? (
        <CollectionGrid collection={collection} parts={collectionParts} excludeId={show?.tmdb_id} t={t} />
      ) : (
        Object.entries(grouped).map(([season, eps]) => {
          const seasonNum = Number(season)
          const watchedCount = watchedCountsBySeason[seasonNum] || 0
          const allWatched = watchedCount === eps.length
          return (
            <SeasonSection
              key={season}
              season={season}
              eps={eps}
              seasonNum={seasonNum}
              watchedCount={watchedCount}
              allWatched={allWatched}
              hasTmdbData={hasTmdbData}
              collapsed={collapsedSeasons.has(seasonNum)}
              watchedCounts={watchedCounts}
              toggling={toggling}
              expandedSynopsis={expandedSynopsis}
              emotions={emotions}
              resumePositions={resumePositions}
              editingPosition={editingPosition}
              editValue={editValue}
              setEditValue={setEditValue}
              editInputRef={editInputRef}
              selectedGroupId={selectedGroupId}
              groupMembers={groupMembers}
              groupProgress={groupProgress}
              memberSeasonProgress={memberSeasonProgress}
              memberColorMap={memberColorMap}
              sortByProgress={sortByProgress}
              markingSeason={markingSeason}
              spoilerFree={spoilerFree}
              avgRuntime={avgRuntime}
              userUid={user?.uid ?? ''}
              t={t}
              onToggleSeason={handleToggleSeason}
              onMarkSeasonWatched={handleMarkSeasonWatched}
              onMarkSeasonUnwatched={handleMarkSeasonUnwatched}
              onToggle={handleToggle}
              onRewatch={handleRewatch}
              onToggleSynopsis={handleToggleSynopsis}
              onResumeClick={handleResumeClick}
              onResumeSave={handleResumeSave}
              onResumePreset={handlePresetPosition}
              onResumeClear={handleClearPosition}
              onResumeKeyDown={handleResumeKeyDown}
              onSortByProgressToggle={(n) => setSortByProgress(prev => { const s = new Set(prev); if (s.has(n)) s.delete(n); else s.add(n); return s })}
            />
          )
        })
      )}
      <MediaGrid
        items={similar}
        isMovie={isMovie}
        label={t.showDetail.similar}
        expanded={showSimilar}
        onToggle={() => setShowSimilar(prev => !prev)}
        onAdd={handleSimilarAdd}
        onWatch={handleSimilarWatch}
        adding={simAdding}
        added={simAdded}
        t={t}
      />
      <MediaGrid
        items={recommended}
        isMovie={isMovie}
        label="Recomendaciones"
        expanded={showRecommended}
        onToggle={() => setShowRecommended(prev => !prev)}
        onAdd={handleSimilarAdd}
        onWatch={handleSimilarWatch}
        adding={simAdding}
        added={simAdded}
        t={t}
      />
      {catchUpPrompt && (
        <CatchUpModal
          data={catchUpPrompt}
          onCatchUp={handleCatchUp}
          onClose={() => setCatchUpPrompt(null)}
          t={t}
        />
      )}
      {confirmSeason && (
        <ConfirmSeasonModal
          data={confirmSeason}
          onConfirm={handleConfirmSeason}
          onCancel={handleCancelSeason}
          t={t}
        />
      )}
      {emotionPickerFor && user?.uid && (
        <EmotionPicker
          uid={user.uid}
          episodeTvTimeId={emotionPickerFor}
          currentEmotion={emotions.get(emotionPickerFor) ?? null}
          onSelect={(emotionId) => {
            setEmotions(prev => { const next = new Map(prev); if (emotionId) next.set(emotionPickerFor, emotionId); else next.delete(emotionPickerFor); return next })
          }}
          onClose={() => setEmotionPickerFor(null)}
        />
      )}
      {groupWatchToast && (
        <div className="fixed bottom-24 right-4 z-50 animate-slide-up">
          <div className="bg-surface border-[3px] border-yellow px-4 py-3 shadow-brutal-xl max-w-xs">
            <div className="text-[10px] font-bold text-text-secondary uppercase">{t.watchParty.watchingTogether}</div>
            <div className="text-xs font-bold mt-1">
              <span className="text-pink">{t.watchParty.aMember}</span>
              {' '}{t.watchParty.watchedEpisode.replace('{episode}', (() => {
                const ep = mergedEpisodes.find(e => e.id === groupWatchToast.episode_id)
                return ep ? `${t.showDetail.episode} ${ep.episode_number} — ${ep.title}` : `#${groupWatchToast.episode_id}`
              })())}
            </div>
          </div>
        </div>
      )}
      {feedbackEp && (
        <div
          className="fixed pointer-events-none z-50 animate-float-up"
          style={{ left: feedbackEp.x, top: feedbackEp.y, transform: 'translate(-50%, -50%)' }}
          aria-hidden="true"
        >
          <span className={`text-3xl font-bold ${feedbackEp.watched ? 'text-yellow' : 'text-pink'}`}>
            {feedbackEp.watched ? 'OK' : 'X'}
          </span>
        </div>
      )}
    </div>
    )}
  </Skeleton>
  )
}

