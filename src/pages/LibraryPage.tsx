import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { useFollowedShows, useWatchlist } from '../hooks'
import { getUserWatchedShowIds } from '../services/showService'
import { findMany } from '../lib/firestore-utils'
import { where } from 'firebase/firestore'
import type { DashItem } from '../services/showService'
import ShowCard from '../components/ShowCard'
import { Skeleton } from 'boneyard-js/react'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'

type Filter = 'all' | 'watching' | 'completed' | 'planned' | 'favorites'

interface LibraryItem extends DashItem {
  status: 'watching' | 'completed' | 'planned'
  favorite: boolean
}

const FILTERS: Filter[] = ['all', 'watching', 'completed', 'planned', 'favorites']

export default function LibraryPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { shows, binging, loading: followedLoading } = useFollowedShows(user?.uid)
  const { items: watchlist, loading: wlLoading } = useWatchlist(user?.uid)
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set())
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    ;(async () => {
      const [watched, ratings] = await Promise.all([
        getUserWatchedShowIds(user.uid),
        findMany<{ show_id: number }>('ratings', where('user_id', '==', user.uid)),
      ])
      if (cancelled) return
      setWatchedIds(watched)
      setFavoriteIds(new Set(ratings.map(r => r.show_id)))
    })()
    return () => { cancelled = true }
  }, [user?.uid])

  const bingingIds = useMemo(() => new Set(binging.map(b => b.id)), [binging])
  const followedIds = useMemo(() => new Set(shows.map(s => s.id)), [shows])

  const items = useMemo<LibraryItem[]>(() => {
    const map = new Map<number, LibraryItem>()
    const add = (s: DashItem, status: LibraryItem['status']) => {
      const existing = map.get(s.id)
      if (existing && existing.status !== 'watching') {
        if (status === 'watching') existing.status = 'watching'
        return
      }
      if (!existing) map.set(s.id, { ...s, status, favorite: favoriteIds.has(s.id) })
    }
    binging.forEach(s => add(s, 'watching'))
    shows.forEach(s => add(s, bingingIds.has(s.id) ? 'watching' : 'planned'))
    watchlist.forEach(w => {
      if (!followedIds.has(w.show_id) && !bingingIds.has(w.show_id)) {
        add({ id: w.show_id, name: w.name, poster_url: w.poster_url, imdb_rating: w.imdb_rating, media_type: w.media_type }, 'planned')
      }
    })
    watchedIds.forEach(id => {
      const it = map.get(id)
      if (it) it.status = 'completed'
    })
    return [...map.values()]
  }, [binging, shows, watchlist, bingingIds, followedIds, watchedIds, favoriteIds])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'favorites') return items.filter(i => i.favorite)
    return items.filter(i => i.status === filter)
  }, [items, filter])

  return (
    <Skeleton name="library" loading={followedLoading && wlLoading && items.length === 0} fallback={<Loading text={t.library.title} />} animate="pulse" transition={300}>
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{t.library.subtitle}</div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase leading-none font-heading">{t.library.title}</h1>
      </div>

      <div className="sticky top-14 z-10 -mx-5 px-5 py-3 bg-bg/95 backdrop-blur-0 border-b-[3px] border-border flex gap-2 overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 border-2 border-border px-3 py-1.5 text-[10px] font-bold uppercase transition-colors cursor-pointer ${filter === f ? 'bg-yellow text-text' : 'bg-surface text-text hover:bg-yellow'}`}
            aria-pressed={filter === f}
          >
            {t.library[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t.library.empty}
          description={t.library.emptyDesc}
          action={{ label: t.library.goDiscover, to: '/discover' }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 auto-rows-[1fr]">
          {filtered.map(item => (
            <ShowCard
              key={item.id}
              id={item.id}
              name={item.name}
              posterUrl={item.poster_url}
              imdbRating={item.imdb_rating}
              mediaType={item.media_type}
              status={item.status}
              span="1x1"
              onRemove={undefined}
            />
          ))}
        </div>
      )}
    </div>
    </Skeleton>
  )
}
