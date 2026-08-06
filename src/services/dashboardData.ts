import { getFinishedContent } from './showService'
import type { DashItem } from './showService'
import { getWatchlist } from './watchlistService'
import { getBingingShows } from './showService'
import { getTvNextEpisode, tmdbLang } from './tmdb'
import type { TmdbTvDetails } from './tmdb'
import { buildShowsMap } from './showService'
import { memoize } from '../lib/hook-cache'

export const cachedGetTvNextEpisode = memoize(getTvNextEpisode, 60 * 60_000)

const ENDED_STATUS = /(ended|canceled|finalizad|cancelad|terminad)/i

function isSeriesStillAiring(detail: TmdbTvDetails | null): boolean {
  if (!detail) return false
  if (detail.next_episode_to_air) return true
  if (detail.in_production) return true
  return !detail.status || !ENDED_STATUS.test(detail.status)
}

export async function splitFinishedByAiringStatus(uid: string, lang: string): Promise<{ finished: DashItem[]; upToDate: DashItem[] }> {
  const [allFinished, showsMap] = await Promise.all([getFinishedContent(uid), buildShowsMap()])
  const stillAiringIds = new Set<number>()
  const upToDateItems: DashItem[] = []
  const finishedItems: DashItem[] = []
  const toCheck = allFinished.filter(f => {
    const s = showsMap.get(f.id)
    return f.tmdb_id && s?.tmdb_id && s?.media_type !== 'movie'
  })
  const results = await Promise.allSettled(
    toCheck.map(f => {
      const tmdbId = showsMap.get(f.id)?.tmdb_id ?? f.tmdb_id!
      return tmdbId ? cachedGetTvNextEpisode(tmdbId, tmdbLang(lang)) : Promise.resolve(null)
    })
  )
  toCheck.forEach((f, i) => {
    const detail = results[i].status === 'fulfilled' ? results[i].value : null
    if (isSeriesStillAiring(detail)) {
      stillAiringIds.add(f.id)
      upToDateItems.push(f)
    }
  })
  allFinished.forEach(f => {
    if (!stillAiringIds.has(f.id)) finishedItems.push(f)
  })
  return { finished: finishedItems, upToDate: upToDateItems }
}

export interface SeedData {
  pending: number[]
  inprogress: number[]
  finished: number[]
  uptodate: number[]
  upcoming: number[]
}

export async function gatherSeedData(uid: string, lang: string): Promise<SeedData> {
  const [watchlist, binging, { finished, upToDate }] = await Promise.all([
    getWatchlist(uid),
    getBingingShows(uid, Number.MAX_SAFE_INTEGER),
    splitFinishedByAiringStatus(uid, lang),
  ])

  const bingingIds = new Set(binging.map(b => b.id))
  const finishedIds = new Set(finished.map(f => f.id))
  const upToDateIds = new Set(upToDate.map(u => u.id))

  const pending = watchlist
    .filter(w => !bingingIds.has(w.show_id) && !finishedIds.has(w.show_id) && !upToDateIds.has(w.show_id))
    .map(w => w.show_id)

  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const showsMap = await buildShowsMap()
  const withTmdb = watchlist
    .filter(w => {
      const s = showsMap.get(w.show_id)
      return s?.tmdb_id && s?.media_type !== 'movie'
    })
    .map(w => ({ show_id: w.show_id, tmdb_id: showsMap.get(w.show_id)?.tmdb_id ?? null }))

  const results = await Promise.allSettled(
    withTmdb.map(s => s.tmdb_id ? cachedGetTvNextEpisode(s.tmdb_id, tmdbLang(lang)) : Promise.resolve(null))
  )
  const upcoming: number[] = []
  withTmdb.forEach((s, i) => {
    const detail = results[i].status === 'fulfilled' ? results[i].value : null
    const next = detail?.next_episode_to_air
    if (!next?.air_date) return
    const airDate = new Date(next.air_date)
    if (airDate > thirtyDays || airDate < now) return
    upcoming.push(s.show_id)
  })

  const inprogressIds = new Set<number>()
  binging.forEach(b => {
    if (!upToDateIds.has(b.id)) inprogressIds.add(b.id)
  })

  return {
    pending,
    inprogress: [...inprogressIds],
    finished: finished.filter(f => !inprogressIds.has(f.id)).map(f => f.id),
    uptodate: upToDate.filter(u => !inprogressIds.has(u.id)).map(u => u.id),
    upcoming,
  }
}
