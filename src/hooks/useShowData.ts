import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getShowById, getEpisodesByShow, getRatingForShow, getWatchedEpisodesForShow,
  getResumePositions, getShowByTmdbId, createShowFromTmdb, addFollowedShow,
  toggleWatchedEpisode, getFollowedTmdbIds,
} from '../services/showService'
import {
  getTmdbDetails, getTmdbDetailsAuto, getTmdbAllEpisodes, getWatchProviders,
  getTmdbCollection, getSimilar, getRecommended, tmdbLang,
} from '../services/tmdb'
import type {
  WatchProvidersResult, TmdbSeasonEpisode, TmdbCollectionPart,
  TmdbCollectionInfo, TmdbSearchResult, TmdbDetails,
} from '../services/tmdb'
import { getEmotionsForShow } from '../services/emotionService'
import { getUserLists } from '../services/listService'
import { doc, setDoc } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { useI18n } from '../lib/I18nContext'
import type { ShowDoc, EpisodeDoc, RatingDoc, CustomListDoc } from '../lib/firebase-queries'
import type { MergedEpisode } from '../components/show-detail/types'

/**
 * Fetches the show, its episodes, ratings, watched counts, TMDB metadata and
 * related recommendations. Owns the derived episode lists used by the rest of
 * the page (mergedEpisodes, grouped, watchedCountsBySeason).
 */
export function useShowData(id: string | undefined, uid: string | undefined) {
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const [streamCountry, setStreamCountry] = useState(() => localStorage.getItem('streamCountry') || 'AR')

  const [show, setShow] = useState<ShowDoc | null>(null)
  const [rating, setRating] = useState<RatingDoc | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [watchedCounts, setWatchedCounts] = useState<Map<number, number>>(new Map())
  const [resumePositions, setResumePositions] = useState<Map<number, number>>(new Map())
  const [emotions, setEmotions] = useState<Map<number, string>>(new Map())
  const [providers, setProviders] = useState<WatchProvidersResult | null>(null)
  const [tmdbEpisodes, setTmdbEpisodes] = useState<TmdbSeasonEpisode[]>([])
  const [tmdbOverview, setTmdbOverview] = useState<string | null>(null)
  const [isMovie, setIsMovie] = useState(false)
  const [collection, setCollection] = useState<TmdbCollectionInfo | null>(null)
  const [collectionParts, setCollectionParts] = useState<TmdbCollectionPart[]>([])
  const [similar, setSimilar] = useState<TmdbSearchResult[]>([])
  const [recommended, setRecommended] = useState<TmdbSearchResult[]>([])
  const [simAdded, setSimAdded] = useState<Map<number, boolean>>(new Map())
  const [simAdding, setSimAdding] = useState<number | null>(null)
  const [year, setYear] = useState<string | null>(null)
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [movieRuntime, setMovieRuntime] = useState<number | null>(null)
  const [userLists, setUserLists] = useState<CustomListDoc[]>([])
  const [showInLists, setShowInLists] = useState<Set<string>>(new Set())
  const [showSimilar, setShowSimilar] = useState(true)
  const [showRecommended, setShowRecommended] = useState(false)
  const autoCollapsedSim = useRef(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

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

  useEffect(() => {
    if (!id || !uid) return
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
          getRatingForShow(uid, sh.tmdb_id),
          getWatchedEpisodesForShow(uid, sh.tmdb_id),
          getResumePositions(uid, sh.tmdb_id),
          getEmotionsForShow(uid, sh.tmdb_id),
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

        const lists = await getUserLists(uid)
        setUserLists(lists)
        setShowInLists(new Set(lists.filter(l => l.show_ids.includes(sh.tmdb_id)).map(l => l.id)))

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
  }, [id, uid, lang, streamCountry, navigate])

  // Sync simAdded with real database state when similar/recommended load
  useEffect(() => {
    if (!uid || (similar.length === 0 && recommended.length === 0)) return
    ;(async () => {
      const followedIds = await getFollowedTmdbIds(uid)
      const allItems = [...similar, ...recommended]
      const added = new Map<number, boolean>()
      allItems.forEach(item => { if (followedIds.has(item.id)) added.set(item.id, true) })
      setSimAdded(added)
    })()
  }, [uid, similar, recommended])

  const handleSimilarAdd = useCallback(async (item: TmdbSearchResult) => {
    if (!uid || simAdding) return
    setSimAdding(item.id)
    try {
      const existing = await getShowByTmdbId(item.id)
      const showId = existing ? existing.data.tmdb_id : await createShowFromTmdb(
        item.id, item.name || item.title || 'Unknown',
        item.poster_path, item.backdrop_path, item.overview,
        item.media_type as 'movie' | 'tv' | undefined
      )
      await addFollowedShow(uid, showId)
      setSimAdded(m => new Map(m).set(item.id, true))
    } catch (e) { console.warn('showDetail action failed', e) }
    setSimAdding(null)
  }, [uid, simAdding])

  const handleSimilarWatch = useCallback(async (item: TmdbSearchResult) => {
    if (!uid || simAdding) return
    setSimAdding(item.id)
    try {
      const existing = await getShowByTmdbId(item.id)
      const showId = existing ? existing.data.tmdb_id : await createShowFromTmdb(
        item.id, item.name || item.title || 'Unknown',
        item.poster_path, item.backdrop_path, item.overview,
        'movie'
      )
      await toggleWatchedEpisode(uid, showId, showId, true, true)
      setSimAdded(m => new Map(m).set(item.id, true))
    } catch (e) { console.warn('showDetail action failed', e) }
    setSimAdding(null)
  }, [uid, simAdding])

  const handleStreamCountryChange = useCallback((country: string) => {
    setStreamCountry(country)
    localStorage.setItem('streamCountry', country)
  }, [])

  const avgRuntime = useMemo(() => {
    if (!show?.episode_run_time?.length) return 0
    const r = show.episode_run_time.filter(t => t > 0)
    return r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : 0
  }, [show?.episode_run_time])

  const episodesLookup = useMemo(() => {
    const map = new Map<string, EpisodeDoc>()
    episodes.forEach(ep => map.set(`${ep.season_number}-${ep.episode_number}`, ep))
    return map
  }, [episodes])

  const mergedEpisodes = useMemo<MergedEpisode[]>(() => {
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

  const grouped = useMemo(() => mergedEpisodes.reduce<Record<number, MergedEpisode[]>>((acc, ep) => { if (!acc[ep.season_number]) acc[ep.season_number] = []; acc[ep.season_number].push(ep); return acc }, {}), [mergedEpisodes])

  const watchedCountsBySeason = useMemo(() => {
    const counts: Record<number, number> = {}
    mergedEpisodes.forEach(ep => { if ((watchedCounts.get(ep.id) ?? 0) > 0) counts[ep.season_number] = (counts[ep.season_number] || 0) + 1 })
    return counts
  }, [mergedEpisodes, watchedCounts])

  const remainingDuration = useMemo(() => {
    if (avgRuntime === 0) return null
    const unwatched = episodes.filter(e => (watchedCounts.get(e.tmdb_id) ?? 0) <= 0).length
    const minutes = unwatched * avgRuntime
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }, [avgRuntime, episodes, watchedCounts])

  const totalEpsCount = mergedEpisodes.length
  const watchedEpsCount = mergedEpisodes.filter(e => (watchedCounts.get(e.id) ?? 0) > 0).length
  const remainingCount = totalEpsCount - watchedEpsCount

  return {
    show, rating, setRating, loading,
    isMovie, providers, tmdbEpisodes, tmdbOverview,
    similar, recommended, simAdded, simAdding,
    collection, collectionParts, year, genres, status, movieRuntime,
    watchedCounts, setWatchedCounts, resumePositions, setResumePositions,
    emotions, setEmotions, userLists, showInLists, setShowInLists,
    showSimilar, setShowSimilar, showRecommended, setShowRecommended,
    mergedEpisodes, grouped, watchedCountsBySeason,
    avgRuntime, remainingDuration, totalEpsCount, remainingCount,
    handleSimilarAdd, handleSimilarWatch, handleStreamCountryChange,
    streamCountry,
  }
}
