import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { useFollowedShows, useStats, useWatchlist } from '../hooks'
import { toggleWatchedEpisode } from '../services/showService'
import type { DashItem } from '../services/showService'
import { getWatchlist, removeFromWatchlist } from '../services/watchlistService'
import { ensureDefaultLists, syncDefaultLists } from '../services/listService'
import { splitFinishedByAiringStatus, gatherSeedData } from '../services/dashboardData'
import { getTvNextEpisode, tmdbLang } from '../services/tmdb'
import { buildShowsMap } from '../lib/firestore-utils'
import type { NextEpisodeToAir } from '../services/tmdb'
import { memento } from '../lib/memento'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ShowCard from '../components/ShowCard'
import DashboardHero from '../components/DashboardHero'
import ContinueWatching from '../components/ContinueWatching'
import UpcomingTimeline from '../components/UpcomingTimeline'
import SectionHeader from '../components/SectionHeader'

interface UpcomingShow {
  show_id: number
  name: string
  poster_url: string | null
  media_type?: 'movie' | 'tv'
  next_episode: NextEpisodeToAir | null
  daysUntil: number | null
}

const cachedGetTvNextEpisode = memento(getTvNextEpisode, 5 * 60_000)

export default function Dashboard() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const { binging, loading, refresh } = useFollowedShows(user?.uid)
  const { stats, streak, refresh: refreshStats } = useStats(user?.uid)
  const { items: watchlist, refresh: refreshWl } = useWatchlist(user?.uid)
  const [upcoming, setUpcoming] = useState<UpcomingShow[]>([])
  const [finished, setFinished] = useState<DashItem[]>([])
  const [upToDate, setUpToDate] = useState<DashItem[]>([])
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const bingingIds = new Set(binging.map(b => b.id))
  const finishedIds = new Set(finished.map(f => f.id))
  const upToDateIds = new Set(upToDate.map(u => u.id))
  const filteredWatchlist = watchlist.filter(item => !bingingIds.has(item.show_id) && !finishedIds.has(item.show_id) && !upToDateIds.has(item.show_id))

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    ;(async () => {
      const showsMap = await buildShowsMap()
      const wl = await getWatchlist(user.uid)
      const withTmdb = wl.filter(f => {
        const s = showsMap.get(f.show_id)
        return s?.tmdb_id && s?.media_type !== 'movie'
      }).slice(0, 8).map(f => ({
        show_id: f.show_id,
        name: f.name,
        poster_url: f.poster_url,
        media_type: showsMap.get(f.show_id)?.media_type,
        tmdb_id: showsMap.get(f.show_id)?.tmdb_id ?? null,
      }))

      const results = await Promise.allSettled(
        withTmdb.map(s => s.tmdb_id ? cachedGetTvNextEpisode(s.tmdb_id, tmdbLang(lang)) : Promise.resolve(null))
      )

      const now = new Date()
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const items: UpcomingShow[] = []
      withTmdb.forEach((s, i) => {
        const detail = results[i].status === 'fulfilled' ? results[i].value : null
        const next = detail?.next_episode_to_air
        if (!next?.air_date) return
        const airDate = new Date(next.air_date)
        if (airDate > thirtyDays || airDate < now) return
        items.push({ ...s, next_episode: next, daysUntil: Math.ceil((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) })
      })
      if (!cancelled) setUpcoming(items.sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999)))
    })()
    return () => { cancelled = true }
  }, [user?.uid, lang])

  useEffect(() => {
    if (!user?.uid) return
    ensureDefaultLists(user.uid, lang)
  }, [user?.uid, lang])

  useEffect(() => {
    if (!user?.uid) return
    const load = async () => {
      const { finished: f, upToDate: u } = await splitFinishedByAiringStatus(user.uid, lang)
      setFinished(f)
      setUpToDate(u)
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.uid, lang])

  useEffect(() => {
    if (!user?.uid) return
    gatherSeedData(user.uid, lang).then(seed => syncDefaultLists(user.uid, seed))
  }, [user?.uid, lang])

  const handleRemoveFromTracking = async (showId: number) => {
    if (!user?.uid || actionLoading !== null) return
    setActionLoading(showId)
    await removeFromWatchlist(user.uid, showId)
    await Promise.all([
      refresh(),
      refreshWl(),
      refreshStats(),
      splitFinishedByAiringStatus(user.uid, lang).then(({ finished: f, upToDate: u }) => { setFinished(f); setUpToDate(u) }),
    ])
    setActionLoading(null)
  }

  const handleMarkWatched = async (showId: number) => {
    if (!user?.uid || actionLoading !== null) return
    setActionLoading(showId)
    await toggleWatchedEpisode(user.uid, showId, showId, true)
    await Promise.all([
      refresh(),
      refreshWl(),
      refreshStats(),
      splitFinishedByAiringStatus(user.uid, lang).then(({ finished: f, upToDate: u }) => { setFinished(f); setUpToDate(u) }),
    ])
    setActionLoading(null)
  }

  const cardActions = (id: number, showWatched: boolean) => (
    <div className="flex gap-1 w-full">
      {!showWatched && (
        <button
          onClick={(e) => { e.preventDefault(); handleMarkWatched(id) }}
          disabled={actionLoading === id}
          className="flex-1 border-2 border-border bg-accent text-text px-2 py-1 text-[9px] font-bold uppercase hover:bg-highlight transition-colors disabled:opacity-40 cursor-pointer"
          aria-label={t.showDetail.markAsWatched}
        >
          {actionLoading === id ? '...' : t.showDetail.markAsWatched}
        </button>
      )}
    </div>
  )

  if (loading && binging.length === 0 && filteredWatchlist.length === 0 && finished.length === 0 && upToDate.length === 0) return <Loading text={t.dashboard.loading} />
  if (binging.length === 0 && filteredWatchlist.length === 0 && finished.length === 0 && upToDate.length === 0) {
    return (
      <EmptyState
        title={t.dashboard.welcome}
        description={t.dashboard.welcomeDesc}
        action={{ label: t.dashboard.goDiscover, to: '/discover' }}
      />
    )
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <DashboardHero
        streak={streak}
        episodesWatched={stats.nb_episodes_watched ?? 0}
        showsTracked={binging.length + filteredWatchlist.length + finished.length + upToDate.length}
        timeSpent={stats.time_spent ?? 0}
      />

      {binging.length > 0 && (
        <ContinueWatching items={binging} />
      )}

      {upcoming.length > 0 && (
        <UpcomingTimeline items={upcoming} />
      )}

      <section aria-labelledby="watchlist-heading">
        <SectionHeader
          id="watchlist-heading"
          title={t.watchlist.title}
          count={filteredWatchlist.length}
          actionLabel={t.dashboard.viewAll}
          actionTo="/profile?section=lists"
        />

        {filteredWatchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {filteredWatchlist.slice(0, 10).map(item => (
              <ShowCard
                key={item.show_id}
                id={item.show_id}
                name={item.name}
                posterUrl={item.poster_url}
                imdbRating={item.imdb_rating}
                mediaType={item.media_type}
                onRemove={() => handleRemoveFromTracking(item.show_id)}
                removing={actionLoading === item.show_id}
                actions={cardActions(item.show_id, false)}
              />
            ))}
            {filteredWatchlist.length > 10 && (
              <Link
                to="/profile?section=lists"
                className="bg-surface border-4 border-border flex items-center justify-center text-xs font-bold uppercase hover:bg-accent transition-colors min-h-[120px]"
              >
                +{filteredWatchlist.length - 10}
              </Link>
            )}
          </div>
        ) : (
          <EmptyState
            title={t.dashboard.watchlistEmpty}
            description={t.dashboard.watchlistEmptyDesc}
            action={{ label: t.dashboard.goDiscover, to: '/discover' }}
          />
        )}
      </section>

      <section aria-labelledby="up-to-date-heading">
        <SectionHeader
          id="up-to-date-heading"
          title={t.dashboard.upToDate}
          count={upToDate.length}
          actionLabel={t.dashboard.refresh}
          onAction={async () => {
            if (!user?.uid || refreshing) return
            setRefreshing(true)
            try {
              const { finished: f, upToDate: u } = await splitFinishedByAiringStatus(user.uid, lang)
              setFinished(f)
              setUpToDate(u)
            } finally {
              setRefreshing(false)
            }
          }}
          actionLoading={refreshing}
        />

        {upToDate.length > 0 ? (
          <>
            <p className="text-xs text-text-secondary mb-4">{t.dashboard.upToDateDesc}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-5">
              {upToDate.map(item => (
                <ShowCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  posterUrl={item.poster_url}
                  imdbRating={item.imdb_rating}
                  mediaType={item.media_type}
                  onRemove={() => handleRemoveFromTracking(item.id)}
                  removing={actionLoading === item.id}
                  actions={cardActions(item.id, true)}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title={t.dashboard.upToDateEmpty}
            description={t.dashboard.upToDateEmptyDesc}
            action={{ label: t.dashboard.goDiscover, to: '/discover' }}
          />
        )}
      </section>

      <section aria-labelledby="finished-heading">
        <SectionHeader
          id="finished-heading"
          title={t.dashboard.finished}
          count={finished.length}
        />

        {finished.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-5">
            {finished.map(item => (
              <ShowCard
                key={item.id}
                id={item.id}
                name={item.name}
                posterUrl={item.poster_url}
                imdbRating={item.imdb_rating}
                mediaType={item.media_type}
                onRemove={() => handleRemoveFromTracking(item.id)}
                removing={actionLoading === item.id}
                actions={cardActions(item.id, false)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.dashboard.finishedEmpty}
            description={t.dashboard.finishedEmptyDesc}
            action={{ label: t.dashboard.goDiscover, to: '/discover' }}
          />
        )}
      </section>
    </div>
  )
}
