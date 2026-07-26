import { collection, query, where, orderBy, limit, getDocs, addDoc, setDoc, doc, deleteDoc, increment, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { findOne, findOneWithId, findMany, exists, upsertDoc, deleteOne, buildShowsMap, clearShowsMapCache } from '../lib/firestore-utils'
import type { ShowDoc, FollowedShowDoc, EpisodeDoc, RatingDoc, ResumePositionDoc } from '../lib/firebase-queries'

export interface DashItem { id: number; name: string; poster_url: string | null; imdb_rating: number | null; tmdb_id?: number | null; media_type?: 'movie' | 'tv' | null }
export interface BingingItem { id: number; name: string; poster_url: string | null; imdb_rating: number | null; tmdb_id?: number | null; progress: number; episodesWatched: number; totalEpisodes: number }

export async function getFollowedActiveShows(uid: string): Promise<DashItem[]> {
  const [followedSnap, showsMap] = await Promise.all([
    getDocs(query(collection(db, 'followed_shows'), where('user_id', '==', uid), where('active', '==', 1), orderBy('followed_at', 'desc'), limit(20))),
    buildShowsMap(),
  ])

  return followedSnap.docs.map(d => {
    const f = d.data() as FollowedShowDoc
    const s = showsMap.get(f.show_id)
    if (!s) return null
    return { id: f.show_id, name: s.name, poster_url: s.poster_url ?? null, imdb_rating: s.imdb_rating ?? null, tmdb_id: s.tmdb_id, media_type: s.media_type }
  }).filter(Boolean) as DashItem[]
}

export async function getBingingShows(uid: string): Promise<BingingItem[]> {
  const [watchlistItems, watchedItems, resumeItems, epsItems, showsMap] = await Promise.all([
    findMany<{ show_id: number }>('watchlist', where('user_id', '==', uid)),
    findMany<{ show_id: number; episode_id: number }>('watched_episodes', where('user_id', '==', uid)),
    findMany<ResumePositionDoc>('resume_positions', where('user_id', '==', uid)),
    findMany<EpisodeDoc>('episodes'),
    buildShowsMap(),
  ])

  const watchlistIds = new Set(watchlistItems.map(w => w.show_id))
  if (watchlistIds.size === 0) return []

  const epsCount = new Map<number, number>()
  epsItems.forEach(e => {
    epsCount.set(e.show_id, (epsCount.get(e.show_id) || 0) + 1)
  })

  const watchedUnique = new Map<number, Set<number>>()
  const watchedMovies = new Set<number>()
  watchedItems.forEach(w => {
    const sid = w.show_id
    const s = showsMap.get(sid)
    if (s?.media_type === 'movie') { watchedMovies.add(sid); return }
    if (!watchedUnique.has(sid)) watchedUnique.set(sid, new Set())
    watchedUnique.get(sid)!.add(w.episode_id)
  })

  const showsWithResume = new Set<number>()
  resumeItems.forEach(r => {
    if (r.position_seconds > 0) showsWithResume.add(r.show_id)
  })

  const result: BingingItem[] = []

  for (const wid of watchlistIds) {
    const s = showsMap.get(wid)
    if (!s) continue
    if (s.media_type === 'movie') {
      const isMovieWatched = watchedMovies.has(wid)
      if (showsWithResume.has(wid) && !isMovieWatched) {
        result.push({
          id: wid,
          name: s?.name ?? 'Unknown',
          poster_url: s?.poster_url ?? null,
          imdb_rating: s?.imdb_rating ?? null,
          tmdb_id: s?.tmdb_id,
          progress: 0,
          episodesWatched: 0,
          totalEpisodes: 1,
        })
      }
    } else {
      const watchedCount = watchedUnique.get(wid)?.size ?? 0
      const total = epsCount.get(wid) || 0
      if (watchedCount > 0 && total > 0 && watchedCount < total) {
        result.push({
          id: wid,
          name: s?.name ?? 'Unknown',
          poster_url: s?.poster_url ?? null,
          imdb_rating: s?.imdb_rating ?? null,
          tmdb_id: s?.tmdb_id,
          progress: Math.round((watchedCount / total) * 100),
          episodesWatched: watchedCount,
          totalEpisodes: total,
        })
      }
    }
  }

  return result.slice(0, 8)
}

export async function getShowById(showId: number) {
  return findOne<ShowDoc>('shows', where('tmdb_id', '==', showId))
}

export async function getEpisodesByShow(showId: number) {
  return findMany<EpisodeDoc>('episodes', where('show_id', '==', showId), orderBy('season_number'), orderBy('episode_number'))
}

export async function ensureEpisode(tmdbEpisodeId: number, showId: number, seasonNumber: number, episodeNumber: number, title: string | null) {
  const existing = await exists('episodes', where('tmdb_id', '==', tmdbEpisodeId))
  if (existing) return tmdbEpisodeId
  await setDoc(doc(db, 'episodes', String(tmdbEpisodeId)), {
    tmdb_id: tmdbEpisodeId,
    show_id: showId,
    season_number: seasonNumber,
    episode_number: episodeNumber,
    title,
  })
  return tmdbEpisodeId
}

export async function getRatingForShow(uid: string, showId: number) {
  return findOne<RatingDoc>('ratings', where('user_id', '==', uid), where('show_id', '==', showId))
}

export async function setRating(uid: string, showId: number, rating: number | null) {
  const constraints = [where('user_id', '==', uid), where('show_id', '==', showId)]
  if (rating === null) {
    await deleteOne('ratings', ...constraints)
    return
  }
  await upsertDoc('ratings', constraints, {
    user_id: uid,
    show_id: showId,
    rating,
    rated_at: new Date().toISOString(),
  })
}

export async function getShowByTmdbId(tmdbId: number) {
  return findOneWithId<ShowDoc>('shows', where('tmdb_id', '==', tmdbId))
}

export async function createShowFromTmdb(tmdbId: number, name: string, posterPath: string | null, backdropPath: string | null, overview: string | null, mediaType?: 'movie' | 'tv') {
  console.log('[createShowFromTmdb] step 2a: exists check', tmdbId)
  const existing = await exists('shows', where('tmdb_id', '==', tmdbId))
  if (existing) { console.log('[createShowFromTmdb] existing, returning'); return tmdbId }
  console.log('[createShowFromTmdb] step 2b: setDoc to shows/', String(tmdbId))
  await setDoc(doc(db, 'shows', String(tmdbId)), {
    tmdb_id: tmdbId,
    name,
    poster_url: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
    backdrop_url: backdropPath ? `https://image.tmdb.org/t/p/w500${backdropPath}` : null,
    synopsis: overview ?? null,
    imdb_rating: null,
    imdb_votes: null,
    imdb_id: null,
    media_type: mediaType ?? 'tv',
  })
  clearShowsMapCache()
  console.log('[createShowFromTmdb] done')
  return tmdbId
}

export async function getWatchedEpisodesForShow(uid: string, showId: number): Promise<Map<number, number>> {
  const items = await findMany<{ episode_id: number }>('watched_episodes', where('user_id', '==', uid), where('show_id', '==', showId))
  const counts = new Map<number, number>()
  items.forEach(d => counts.set(d.episode_id, (counts.get(d.episode_id) || 0) + 1))
  return counts
}

export async function toggleWatchedEpisode(uid: string, episodeId: number, showId: number, watched: boolean, skipIfExists = false) {
  const snap = await getDocs(query(
    collection(db, 'watched_episodes'),
    where('user_id', '==', uid),
    where('episode_id', '==', episodeId),
  ))
  if (watched) {
    if (skipIfExists && !snap.empty) return
    await addDoc(collection(db, 'watched_episodes'), {
      user_id: uid,
      episode_id: episodeId,
      show_id: showId,
      watched_at: new Date().toISOString(),
    })
    await updateStatsOnToggle(uid, 1)
  } else if (!snap.empty) {
    const count = snap.docs.length
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
    if (count > 0) {
      await updateStatsOnToggle(uid, -count)
    }
  }
}

async function updateStatsOnToggle(uid: string, delta: number) {
  const snap = await getDocs(query(collection(db, 'user_stats'), where('user_id', '==', uid), limit(1)))
  if (snap.empty) return
  await updateDoc(snap.docs[0].ref, {
    nb_episodes_watched: increment(delta),
    time_spent: increment(delta * 30),
  })
}

export async function getUserWatchlistTmdbMap(uid: string): Promise<Map<number, number>> {
  const [items, showsMap] = await Promise.all([
    findMany<{ show_id: number }>('watchlist', where('user_id', '==', uid)),
    buildShowsMap(),
  ])
  const watchlistIds = new Set(items.map(w => w.show_id))
  const map = new Map<number, number>()
  showsMap.forEach((s, showId) => {
    if (s.tmdb_id && watchlistIds.has(showId)) {
      map.set(s.tmdb_id, showId)
    }
  })
  return map
}

/** Returns the set of show_ids that the user has watched at least one episode of. */
export async function getUserWatchedShowIds(uid: string): Promise<Set<number>> {
  const items = await findMany<{ show_id: number }>('watched_episodes', where('user_id', '==', uid))
  return new Set(items.map(w => w.show_id))
}

export async function getResumePositions(uid: string, showId: number): Promise<Map<number, number>> {
  const items = await findMany<ResumePositionDoc>('resume_positions', where('user_id', '==', uid), where('show_id', '==', showId))
  const map = new Map<number, number>()
  items.forEach(r => map.set(r.content_id, r.position_seconds))
  return map
}

export async function setResumePosition(uid: string, contentId: number, showId: number, contentType: 'episode' | 'movie', seconds: number | null) {
  const constraints = [where('user_id', '==', uid), where('content_id', '==', contentId), where('content_type', '==', contentType)]
  if (seconds === null) {
    await deleteOne('resume_positions', ...constraints)
    return
  }
  await upsertDoc('resume_positions', constraints, {
    user_id: uid,
    content_id: contentId,
    content_type: contentType,
    show_id: showId,
    position_seconds: seconds,
    updated_at: new Date().toISOString(),
  })
}

export async function addFollowedShow(uid: string, showId: number) {
  const existing = await exists('followed_shows', where('user_id', '==', uid), where('show_id', '==', showId))
  if (existing) return false
  await addDoc(collection(db, 'followed_shows'), {
    user_id: uid,
    show_id: showId,
    active: 1,
    followed_at: new Date().toISOString(),
  })
  return true
}

export async function removeFollowedShow(uid: string, showId: number) {
  await deleteOne('followed_shows', where('user_id', '==', uid), where('show_id', '==', showId))
}

export async function getFinishedContent(uid: string): Promise<DashItem[]> {
  const [watchedItems, epsItems, showsMap] = await Promise.all([
    findMany<{ show_id: number; episode_id?: number; watched_at?: string }>('watched_episodes', where('user_id', '==', uid)),
    findMany<EpisodeDoc>('episodes'),
    buildShowsMap(),
  ])

  const epsCount = new Map<number, number>()
  epsItems.forEach(e => {
    epsCount.set(e.show_id, (epsCount.get(e.show_id) || 0) + 1)
  })

  const latestWatch = new Map<number, string>()
  const watchedUnique = new Map<number, Set<number>>()
  const watchedMovies = new Set<number>()
  watchedItems.forEach(w => {
    const sid = w.show_id
    const s = showsMap.get(sid)
    const wat = w.watched_at || ''
    const current = latestWatch.get(sid) || ''
    if (wat > current) {
      latestWatch.set(sid, wat)
    }

    if (s?.media_type === 'movie') { watchedMovies.add(sid); return }
    if (w.episode_id) {
      if (!watchedUnique.has(sid)) watchedUnique.set(sid, new Set())
      watchedUnique.get(sid)!.add(w.episode_id)
    }
  })

  const finished: (DashItem & { finished_at?: string })[] = []
  for (const [sid, uniqueEps] of watchedUnique) {
    const count = uniqueEps.size
    const total = epsCount.get(sid) || 0
    if (total > 0 && count >= total) {
      const s = showsMap.get(sid)
      if (s) {
        finished.push({
          id: sid,
          name: s.name,
          poster_url: s.poster_url,
          imdb_rating: s.imdb_rating,
          tmdb_id: s.tmdb_id,
          media_type: s.media_type,
          finished_at: latestWatch.get(sid)
        })
      }
    }
  }
  for (const mid of watchedMovies) {
    const s = showsMap.get(mid)
    if (s) {
      finished.push({
        id: mid,
        name: s.name,
        poster_url: s.poster_url,
        imdb_rating: s.imdb_rating,
        tmdb_id: s.tmdb_id,
        media_type: s.media_type,
        finished_at: latestWatch.get(mid)
      })
    }
  }
  return finished.sort((a, b) => {
    const da = a.finished_at || ''
    const db = b.finished_at || ''
    if (da && db) return db.localeCompare(da)
    return da ? -1 : db ? 1 : a.name.localeCompare(b.name)
  })
}
