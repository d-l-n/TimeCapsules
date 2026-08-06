import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getShowById, getEpisodesByShow, getRatingForShow, getWatchedEpisodesForShow, toggleWatchedEpisode, removeWatchedEpisode, batchUpdateStats, getResumePositions, getShowByTmdbId, createShowFromTmdb, addFollowedShow, ensureEpisode, getFollowedTmdbIds } from '../services/showService'
import { applyWatchedBatch } from '../services/episodeBatch'
import type { ShowDoc, EpisodeDoc, RatingDoc } from '../lib/firebase-queries'
import { getTmdbDetails, getTmdbDetailsAuto, getTmdbAllEpisodes, getWatchProviders, getTmdbCollection, getSimilar, getRecommended, tmdbLang } from '../services/tmdb'
import type { WatchProvidersResult, TmdbSeasonEpisode, TmdbCollectionPart, TmdbCollectionInfo, TmdbSearchResult, TmdbDetails } from '../services/tmdb'
import { useI18n } from '../lib/I18nContext'
import { useAuth } from '../lib/AuthContext'
import { useGroups, useWatchlistStatus, useSpoilerFree } from '../hooks'
import { getGroupMembers, getGroupEpisodeProgress, createGroupWatchEvent, listenToGroupWatchEvents, addShowToGroup, getGroupShows } from '../services/groupService'
import { addToWatchlist, removeFromWatchlist } from '../services/watchlistService'
import { getUserLists, addShowToList, removeShowFromList, getListDisplayName } from '../services/listService'
import type { CustomListDoc } from '../lib/firebase-queries'
import type { GroupEpisodeProgress, MemberWithProfile } from '../services/groupService'
import type { GroupWatchEventDoc } from '../lib/firebase-queries'
import { doc, setDoc } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import EmotionPicker from '../components/EmotionPicker'
import { getEmotionsForShow } from '../services/emotionService'

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
import { playWatchSound, playUnwatchSound, playCelebrationSound } from '../lib/sound'
import { triggerConfetti } from '../lib/confetti'
import { TimerIcon } from '../components/Icons'
import BrutalDropdown from '../components/BrutalDropdown'
import ShowToasts from '../components/show-detail/ShowToasts'
import { useResumePosition } from '../hooks/useResumePosition'
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
  const [showSimilar, setShowSimilar] = useState(true)
  const [showRecommended, setShowRecommended] = useState(false)
  const autoCollapsedSim = useRef(false)

  // Reset Similar state on navigation (component doesn't remount in React Router)
  useEffect(() => {
    setShowSimilar(true)
    setShowRecommended(false)
    autoCollapsedSim.current = false
  }, [id])

  // Collapse Similar by default when a collection is present (user can still re-expand)
  useEffect(() => {
    if (collection && !autoCollapsedSim.current) {
      setShowSimilar(false)
      autoCollapsedSim.current = true
    }
  }, [collection])
  const [movieToggling, setMovieToggling] = useState(false)
  const [showGroupFeed, setShowGroupFeed] = useState(false)
  const [resumePositions, setResumePositions] = useState<Map<number, number>>(new Map())
  const [feedbackEp, setFeedbackEp] = useState<{ id: number; watched: boolean; x: number; y: number } | null>(null)
  const togglingRef = useRef(false)
  const resume = useResumePosition(user?.uid, show, setResumePositions)
  const movieTogglingRef = useRef(false)
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
  const [confirmSeason, setConfirmSeason] = useState<{
    seasonNumber: number
    episodeIds: number[]
    action: 'watch' | 'unwatch'
    laterEpisodeIds?: number[]
  } | null>(null)
  const [groupWatchFeed, setGroupWatchFeed] = useState<GroupWatchEventDoc[]>([])
  const [groupWatchToast, setGroupWatchToast] = useState<GroupWatchEventDoc | null>(null)
  const [movieRuntime, setMovieRuntime] = useState<number | null>(null)
  const [year, setYear] = useState<string | null>(null)
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [sortByProgress, setSortByProgress] = useState<Set<number>>(new Set())
  const [showsInGroups, setShowsInGroups] = useState<Set<string>>(new Set())
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [wlToggling, setWlToggling] = useState(false)
  const [listToggling, setListToggling] = useState<Set<string>>(new Set())
  const [episodeToast, setEpisodeToast] = useState<{ episodeNumber: number; seasonNumber: number; watched: boolean } | null>(null)
  const [seasonToast, setSeasonToast] = useState<{ seasonNumber: number; action: 'watch' | 'unwatch'; count: number } | null>(null)
  const [seriesToast, setSeriesToast] = useState<number | null>(null)
  const [movieToast, setMovieToast] = useState<{ watched: boolean; name: string } | null>(null)
  const [watchlistToast, setWatchlistToast] = useState<{ added: boolean } | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; context: 'catchUp' | 'season' } | null>(null)
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('compactMode') === 'true')
  const handleCompactToggle = useCallback(() => {
    setCompactMode(prev => { const next = !prev; localStorage.setItem('compactMode', String(next)); return next })
  }, [])
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
      const showId = existing ? existing.data.tmdb_id : await createShowFromTmdb(
        item.id, item.name || item.title || 'Unknown',
        item.poster_path, item.backdrop_path, item.overview,
        item.media_type as 'movie' | 'tv' | undefined
      )
      await addFollowedShow(user.uid, showId)
      setSimAdded(m => new Map(m).set(item.id, true))
    } catch (e) { console.warn('showDetail action failed', e) }
    setSimAdding(null)
  }, [user?.uid, simAdding])

  const handleSimilarWatch = useCallback(async (item: TmdbSearchResult) => {
    if (!user?.uid || simAdding) return
    setSimAdding(item.id)
    try {
      const existing = await getShowByTmdbId(item.id)
      const showId = existing ? existing.data.tmdb_id : await createShowFromTmdb(
        item.id, item.name || item.title || 'Unknown',
        item.poster_path, item.backdrop_path, item.overview,
        'movie'
      )
      await toggleWatchedEpisode(user.uid, showId, showId, true, true)
      setSimAdded(m => new Map(m).set(item.id, true))
    } catch (e) { console.warn('showDetail action failed', e) }
    setSimAdding(null)
  }, [user?.uid, simAdding])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    if (!id || !user?.uid) return
    const showId = parseInt(id)
    let cancelled = false
    ;(async () => {
      try {
        const db = await getDb()
        let sh = await getShowById(showId)
        if (cancelled) return

        if (!sh && showId < 0) {
          const tmdbId = -showId
          const existing = await getShowByTmdbId(tmdbId)
          if (existing) {
            if (existing.data.tmdb_id !== showId) {
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
              sh = await getShowById(showId)
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

        // Reset metadata for new show
        setYear(null)
        setGenres([])
        setStatus(null)

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
            const rawDate = isMovieType ? (details as any).release_date : (details as any).first_air_date
            setYear(rawDate ? String(rawDate).split('-')[0] : null)
            setGenres((details as any).genres ?? [])
            setStatus((details as any).status ?? null)
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
      } catch (e) { console.warn('showDetail action failed', e) }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, user?.uid, lang, streamCountry, navigate])

  useEffect(() => {
    setSortByProgress(new Set())
  }, [selectedGroupId])

  // Sync simAdded with real database state when similar/recommended load
  useEffect(() => {
    if (!user?.uid || (similar.length === 0 && recommended.length === 0)) return
    ;(async () => {
      const followedIds = await getFollowedTmdbIds(user.uid)
      const allItems = [...similar, ...recommended]
      const added = new Map<number, boolean>()
      allItems.forEach(item => { if (followedIds.has(item.id)) added.set(item.id, true) })
      setSimAdded(added)
    })()
  }, [user?.uid, similar, recommended])

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
      await toggleWatchedEpisode(user.uid, event.episode_id, showId, true, true)
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

  const resolveEpisodeId = useCallback(async (episodeId: number): Promise<number> => {
    if (episodeId >= 0 || !show?.tmdb_id) return episodeId
    const ep = mergedEpisodes.find(e => e.id === episodeId)
    if (!ep) return Math.abs(episodeId)
    await ensureEpisode(Math.abs(episodeId), show.tmdb_id, ep.season_number, ep.episode_number, ep.title === `${t.showDetail.episode} ${ep.episode_number}` ? null : ep.title)
    return Math.abs(episodeId)
  }, [show?.tmdb_id, mergedEpisodes, t.showDetail.episode])

  const handleToggle = useCallback(async (episodeId: number, currentlyWatched: boolean, clientX?: number, clientY?: number) => {
    if (!user?.uid || !id || toggling !== null || togglingRef.current) return

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
      await toggleWatchedEpisode(user.uid, realId, parseInt(id), !currentlyWatched, true)
      if (!currentlyWatched && selectedGroupId) {
        await createGroupWatchEvent(selectedGroupId, realId, parseInt(id), user.uid)
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
  }, [user?.uid, id, toggling, mergedEpisodes, watchedCounts, selectedGroupId, resolveEpisodeId])

  const handleCatchUp = useCallback(async (markAll: boolean) => {
    const prompt = catchUpPrompt
    if (!prompt || !user?.uid || !id) return
    setCatchUpPrompt(null)

    const idsToWatch = markAll ? [...prompt.prevIds, prompt.episodeId] : (prompt.seasonEpisodeIds ?? [prompt.episodeId])
    const showId = parseInt(id)

    setBatchProgress({ current: 0, total: idsToWatch.length, context: 'catchUp' })
    setToggling(prompt.episodeId)
    togglingRef.current = true
    try {
      const realIds = await Promise.all(idsToWatch.map(eid => resolveEpisodeId(eid)))
      // Parallel Firestore writes — no existence query, no per-item stats
      await applyWatchedBatch(user.uid, showId, realIds, selectedGroupId)
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
  }, [catchUpPrompt, user?.uid, id, selectedGroupId, resolveEpisodeId, grouped, watchedCounts, mergedEpisodes])

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
      playWatchSound()
      const ep = mergedEpisodes.find(e => e.id === episodeId)
      if (ep) {
        setEpisodeToast({ episodeNumber: ep.episode_number, seasonNumber: ep.season_number, watched: true })
        setTimeout(() => setEpisodeToast(null), 3000)
      }
    } catch (e) { console.warn('showDetail action failed', e) }
    setToggling(null)
  }, [user?.uid, id, toggling, selectedGroupId, mergedEpisodes, resolveEpisodeId])

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

    const laterWatched = mergedEpisodes
      .filter(e => e.season_number > seasonNumber && (watchedCounts.get(e.id) ?? 0) > 0)
    const laterIds = laterWatched.map(e => e.id)
    if (laterIds.length > 0) {
      setConfirmSeason({ seasonNumber, episodeIds: watchedIds, action: 'unwatch', laterEpisodeIds: laterIds })
    } else {
      setConfirmSeason({ seasonNumber, episodeIds: watchedIds, action: 'unwatch' })
    }
  }, [user?.uid, id, markingSeason, watchedCounts, mergedEpisodes])

  const handleConfirmSeason = useCallback(async (includeLater?: boolean) => {
    const cs = confirmSeason
    if (!cs || !user?.uid || !id || markingSeason !== null) return
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
        await applyWatchedBatch(user.uid, showId, realIds, selectedGroupId)
      } else {
        const removedCounts = await Promise.all(realIds.map(realId => removeWatchedEpisode(user.uid, realId)))
        const totalRemoved = removedCounts.reduce((a, b) => a + b, 0)
        if (totalRemoved > 0) await batchUpdateStats(user.uid, -totalRemoved)
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
  }, [confirmSeason, user?.uid, id, markingSeason, selectedGroupId, resolveEpisodeId, mergedEpisodes, watchedCounts])

  const handleCancelSeason = useCallback(() => setConfirmSeason(null), [])

  const handleToggleSeason = useCallback((seasonNum: number) => {
    setCollapsedSeasons(prev => {
      const next = new Set(prev)
      if (next.has(seasonNum)) next.delete(seasonNum)
      else next.add(seasonNum)
      return next
    })
  }, [])

  const allSeasonNums = useMemo(() => Object.keys(grouped).map(Number).sort((a, b) => a - b), [grouped])
  const allCollapsed = allSeasonNums.length > 0 && allSeasonNums.every(s => collapsedSeasons.has(s))

  const handleCollapseAll = useCallback(() => {
    setCollapsedSeasons(new Set(allSeasonNums))
  }, [allSeasonNums])

  const handleExpandAll = useCallback(() => {
    setCollapsedSeasons(new Set())
  }, [])

  const handleMovieToggle = useCallback(async () => {
    if (!user?.uid || movieToggling || movieTogglingRef.current) return
    movieTogglingRef.current = true
    const showId = show?.tmdb_id
    if (!showId) { movieTogglingRef.current = false; return }
    setMovieToggling(true)
    try {
      const isCurrentlyWatched = isMovie && (watchedCounts.get(showId) ?? 0) > 0
      await toggleWatchedEpisode(user.uid, showId, showId, !isCurrentlyWatched, true)
      if (!isCurrentlyWatched && selectedGroupId) {
        await createGroupWatchEvent(selectedGroupId, showId, showId, user.uid)
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
  }, [user?.uid, movieToggling, show, isMovie, watchedCounts, selectedGroupId])



  const backdrop = show?.backdrop_url ?? null
  const movieWatched = isMovie && show && (watchedCounts.get(show.tmdb_id) ?? 0) > 0

  return loading ? <Loading text={t.showDetail.loading} /> : (
    <>{!show ? (
      <EmptyState title={t.showDetail.notFound}><button onClick={() => navigate(-1)} className="underline font-bold">{t.showDetail.back}</button></EmptyState>
    ) : (
    <div className="space-y-8">
      {backdrop && <div className="relative h-48 sm:h-64 overflow-hidden sm:border-[3px] sm:border-border -mx-4 sm:-mx-0"><img src={backdrop} alt="" aria-hidden="true" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)' }} /><div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" /><div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-bg to-transparent" /></div>}
      <div className="relative -mt-12 sm:-mt-24 mx-4 sm:mx-0 p-4 sm:p-6 bg-surface border-[3px] border-border shadow-brutal space-y-3 sm:space-y-4 z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button onClick={() => navigate(-1)} className="btn-brutal text-xs sm:text-sm" aria-label={`${t.showDetail.back}`}>&larr; {t.showDetail.back}</button>
          {user?.uid && (
            <div className="relative shrink-0">
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
        </div>
        <div className="border-b-[3px] border-border pb-4 sm:pb-5 mb-1 space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-yellow">{isMovie ? t.discover.movie : t.discover.tv}</span>
            {year && <span className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-surface">{year}</span>}
            {genres.slice(0, 3).map(g => (
              <button
                key={g.id}
                onClick={() => {
                  sessionStorage.setItem('discover_search_query', g.name)
                  sessionStorage.setItem('discover_search_searched', 'true')
                  navigate('/discover')
                }}
                className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-surface sm:hover:bg-yellow transition-colors cursor-pointer"
                aria-label={t.showDetail.filterBy.replace('{name}', g.name)}
              >
                {g.name}
              </button>
            ))}
            {(isMovie ? movieRuntime : avgRuntime > 0) && (
              <span className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-surface">
                {isMovie ? `${movieRuntime}m` : `${avgRuntime}m`}
              </span>
            )}
            {!isMovie && status && (
              <span className={`border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase ${
                status === 'Returning Series' || status === 'In Production' ? 'bg-green/30' :
                status === 'Canceled' ? 'bg-red/30' : 'bg-surface'
              }`}>
                {status === 'Returning Series' ? t.showDetail.statusReturning :
                 status === 'Ended' ? t.showDetail.statusEnded :
                 status === 'Canceled' ? t.showDetail.statusCanceled :
                 status === 'In Production' ? t.showDetail.statusInProduction :
                 status === 'Planned' ? t.showDetail.statusPlanned :
                 status === 'Pilot' ? t.showDetail.statusPilot :
                 status}
              </span>
            )}
            {!spoilerFree && show.imdb_rating != null && (
              <div className="border-[3px] border-border px-1.5 sm:px-2 py-1 sm:py-1.5 bg-surface font-bold text-[9px] sm:text-xs shadow-brutal-xs">{t.showDetail.imdb}: <span className="text-pink">{show.imdb_rating}</span>{show.imdb_votes != null && <span className="font-normal text-text-secondary ml-1">({show.imdb_votes.toLocaleString()} {t.showDetail.votes})</span>}</div>
            )}
          </div>
          <h1 className="text-xl sm:text-4xl md:text-5xl font-black uppercase leading-tight break-words font-heading">{show.name}</h1>
          {(tmdbOverview ?? show.synopsis) && <p className="text-xs sm:text-sm leading-relaxed max-w-3xl">{tmdbOverview ?? show.synopsis}</p>}
        </div>
        <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
          {!wlLoading && user?.uid && show?.tmdb_id && (
            <button
              onClick={async () => {
                if (wlToggling) return
                setWlToggling(true)
                try {
                  const adding = !inWatchlist
                  if (inWatchlist) { await removeFromWatchlist(user.uid, show.tmdb_id); setInWatchlist(false); playUnwatchSound() }
                  else { await addToWatchlist(user.uid, show.tmdb_id); setInWatchlist(true); playWatchSound() }
                  setWatchlistToast({ added: adding })
                  setTimeout(() => setWatchlistToast(null), 3000)
                } catch (e) { console.warn('showDetail action failed', e) }
                setWlToggling(false)
              }}
              disabled={wlToggling}
              className={`btn-brutal text-xs sm:text-sm ${wlToggling ? 'bg-yellow/50 text-text/50 cursor-wait' : inWatchlist ? 'bg-yellow cursor-pointer' : 'bg-surface cursor-pointer'}`}
              aria-label={inWatchlist ? t.watchlist.removeAction : t.watchlist.addAction}
            >
              {wlToggling ? '…' : inWatchlist ? t.watchlist.added : t.watchlist.add}
            </button>
          )}
          {user?.uid && show?.tmdb_id && (
            <div className="relative">
              <button onClick={() => setShowListPicker(prev => !prev)} className="btn-brutal text-xs sm:text-sm">{t.lists.addToList}</button>
              {showListPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowListPicker(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-surface border-[3px] border-border z-20 min-w-48 max-h-60 overflow-y-auto shadow-brutal-md">
                  {userLists.length === 0 && <div className="px-3 py-2 text-xs text-text-secondary">{t.lists.noLists}</div>}
                      {userLists.map(list => {
                    const inList = showInLists.has(list.id)
                    const isToggling = listToggling.has(list.id)
                    return (
                      <button
                        key={list.id}
                        onClick={async () => {
                          if (isToggling) return
                          setListToggling(prev => new Set(prev).add(list.id))
                          try {
                            if (inList) { await removeShowFromList(list.id, show.tmdb_id); setShowInLists(prev => { const n = new Set(prev); n.delete(list.id); return n }) }
                            else { await addShowToList(list.id, show.tmdb_id); setShowInLists(prev => { const n = new Set(prev); n.add(list.id); return n }) }
                          } catch (e) { console.warn('showDetail action failed', e) }
                          setListToggling(prev => { const n = new Set(prev); n.delete(list.id); return n })
                        }}
                        disabled={isToggling}
                        className={`w-full text-left px-3 py-2 text-xs font-bold border-b-2 border-border last:border-b-0 transition-colors ${isToggling ? 'bg-surface/50 text-text/50 cursor-wait' : inList ? 'bg-yellow text-text sm:hover:bg-yellow cursor-pointer' : 'bg-surface text-text sm:hover:bg-yellow cursor-pointer'}`}
                        aria-label={(inList ? t.lists.removeFromListAria : t.lists.addToListAria).replace('{name}', getListDisplayName(list, lang))}
                      >
                        {isToggling ? '…' : `${getListDisplayName(list, lang)} ${inList ? t.common.ok : ''}`}
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
                disabled={movieToggling}
                className={`btn-brutal text-xs sm:text-sm transition-all duration-300 ease-out ${movieToggling ? 'bg-yellow/50 text-text/50 cursor-wait' : movieWatched ? 'bg-yellow cursor-pointer' : 'bg-surface cursor-pointer'}`}
                aria-label={movieWatched ? t.showDetail.watched : t.showDetail.markAsWatched}
              >
                {movieToggling ? '…' : movieWatched ? t.showDetail.watched : t.showDetail.markAsWatched}
              </button>
              {resume.editingPosition === show.tmdb_id ? (
                <PositionEditor
                  contentId={show.tmdb_id}
                  contentType="movie"
                  maxSeconds={movieRuntime ? movieRuntime * 60 : 7200}
                  editValue={resume.editValue}
                  setEditValue={resume.setEditValue}
                  editInputRef={resume.editInputRef}
                  currentSeconds={resumePositions.get(show.tmdb_id)}
                  onSave={resume.handleResumeSave}
                  onPreset={resume.handlePresetPosition}
                  onClear={resume.handleClearPosition}
                  onKeyDown={resume.handleResumeKeyDown}
                  t={t}
                />
              ) : (
                <button
                  onClick={() => resume.handleResumeClick(show.tmdb_id, resumePositions.get(show.tmdb_id))}
                  className="btn-brutal text-xs sm:text-sm"
                  aria-label={t.showDetail.resumePosition}
                >
                  <TimerIcon className="w-3.5 h-3.5" />
                  {resumePositions.has(show.tmdb_id) ? fmtPos(resumePositions.get(show.tmdb_id)!) : t.showDetail.noPosition}
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
          <BrutalDropdown
            value={selectedGroupId ?? ''}
            options={groups.map(g => ({ value: g.id, label: g.name }))}
            onChange={v => setSelectedGroupId(v || null)}
            placeholder={t.watchParty.justMe}
            ariaLabel={t.watchParty.selectGroup}
            buttonClassName="text-xs px-3 py-2 shadow-brutal-sm"
          />
          {selectedGroupId && (
            <button
              onClick={async () => {
                if (!user?.uid || !show?.tmdb_id || addingToGroup) return
                setAddingToGroup(selectedGroupId)
                try {
                  await addShowToGroup(selectedGroupId, show.tmdb_id, user.uid)
                  setShowsInGroups(prev => new Set(prev).add(selectedGroupId))
                } catch (e) { console.warn('showDetail action failed', e) }
                setAddingToGroup(null)
              }}
              disabled={!show?.tmdb_id || showsInGroups.has(selectedGroupId) || addingToGroup !== null}
              className={`border-2 border-border px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
                addingToGroup === selectedGroupId
                  ? 'bg-yellow/50 text-text/50 cursor-wait'
                  : showsInGroups.has(selectedGroupId)
                    ? 'bg-green/30 text-text border-green cursor-pointer'
                    : 'bg-surface text-text sm:hover:bg-yellow cursor-pointer'
              }`}
              aria-label={showsInGroups.has(selectedGroupId) ? t.groups.alreadyInGroup : t.showDetail.addShowToGroup}
            >
              {addingToGroup === selectedGroupId
                ? '...'
                : showsInGroups.has(selectedGroupId)
                  ? `✓ ${t.groups.alreadyInGroup}`
                  : `+ ${t.watchParty.addToGroup}`}
            </button>
          )}
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
            <h3 className="text-[10px] font-bold uppercase text-text-secondary border-b-2 border-border pb-1 flex items-center gap-1.5 sm:hover:text-orange transition-colors">
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
        <>
          {allSeasonNums.length > 1 && (
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCompactToggle}
                className={`border-2 border-border px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer ${compactMode ? 'bg-yellow text-text' : 'bg-surface sm:hover:bg-yellow'}`}
                aria-label={t.showDetail.compactMode}
              >
                {t.showDetail.compactMode} {compactMode ? t.settings.on : t.settings.off}
              </button>
              <button
                onClick={allCollapsed ? handleExpandAll : handleCollapseAll}
                className="border-2 border-border px-2 py-1 text-[10px] font-bold uppercase bg-surface sm:hover:bg-yellow transition-colors cursor-pointer"
                aria-label={allCollapsed ? t.showDetail.expandAll : t.showDetail.collapseAll}
              >
                {allCollapsed ? t.showDetail.expandAll : t.showDetail.collapseAll}
              </button>
            </div>
          )}
          {Object.entries(grouped).map(([season, eps]) => {
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
              editingPosition={resume.editingPosition}
              editValue={resume.editValue}
              setEditValue={resume.setEditValue}
              editInputRef={resume.editInputRef}
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
              compactMode={compactMode}
              t={t}
              onToggleSeason={handleToggleSeason}
              onMarkSeasonWatched={handleMarkSeasonWatched}
              onMarkSeasonUnwatched={handleMarkSeasonUnwatched}
              onToggle={handleToggle}
              onRewatch={handleRewatch}
              onToggleSynopsis={handleToggleSynopsis}
              onResumeClick={resume.handleResumeClick}
              onResumeSave={resume.handleResumeSave}
              onResumePreset={resume.handlePresetPosition}
              onResumeClear={resume.handleClearPosition}
              onResumeKeyDown={resume.handleResumeKeyDown}
              onSortByProgressToggle={(n) => setSortByProgress(prev => { const s = new Set(prev); if (s.has(n)) s.delete(n); else s.add(n); return s })}
            />
          )
        })}
        </>
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
        label={t.showDetail.recommendations}
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
          isProcessing={toggling !== null}
        />
      )}
      {confirmSeason && (
        <ConfirmSeasonModal
          data={confirmSeason}
          onConfirm={handleConfirmSeason}
          onCancel={handleCancelSeason}
          t={t}
          isProcessing={markingSeason !== null}
        />
      )}
      {emotionPickerFor && user?.uid && (
        <EmotionPicker
          uid={user.uid}
          episodeId={emotionPickerFor}
          currentEmotion={emotions.get(emotionPickerFor) ?? null}
          onSelect={(emotionId) => {
            setEmotions(prev => { const next = new Map(prev); if (emotionId) next.set(emotionPickerFor, emotionId); else next.delete(emotionPickerFor); return next })
          }}
          onClose={() => setEmotionPickerFor(null)}
          t={t}
        />
      )}
      <ShowToasts
        batchProgress={batchProgress}
        watchlistToast={watchlistToast}
        episodeToast={episodeToast}
        movieToast={movieToast}
        seasonToast={seasonToast}
        groupWatchToast={groupWatchToast}
        seriesToast={seriesToast}
        feedbackEp={feedbackEp}
        showName={show?.name ?? null}
        uid={user?.uid ?? ''}
        mergedEpisodes={mergedEpisodes}
        currentEmotion={seriesToast !== null ? emotions.get(seriesToast) ?? null : null}
        onEmotionSelect={(emotionId) => {
          if (seriesToast === null) return
          setEmotions(prev => { const n = new Map(prev); if (emotionId) n.set(seriesToast, emotionId); else n.delete(seriesToast); return n })
        }}
        onSeriesToastClose={() => setSeriesToast(null)}
        t={t}
      />
    </div>
    )}
    </>
  )
}

