import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { searchMulti, getPosterUrl, getTrending, tmdbLang, type TmdbSearchResult } from '../services/tmdb'
import { getShowByTmdbId, createShowFromTmdb, toggleWatchedEpisode, getUserWatchlistTmdbMap, getUserWatchedShowIds } from '../services/showService'
import { addToWatchlist } from '../services/watchlistService'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import EmptyState from '../components/EmptyState'
import SectionHeader from '../components/SectionHeader'

const STORAGE_KEY = 'discover_search'

interface ItemMeta { added: boolean; showId?: number; watched?: boolean; watchedCount?: number }

export default function DiscoverPage() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [query, setQuery] = useState(() => sessionStorage.getItem(`${STORAGE_KEY}_query`) || '')
  const [results, setResults] = useState<TmdbSearchResult[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(`${STORAGE_KEY}_results`) || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(() => sessionStorage.getItem(`${STORAGE_KEY}_searched`) === 'true')
  const [trending, setTrending] = useState<TmdbSearchResult[]>([])
  const [metaMap, setMetaMap] = useState<Record<number, ItemMeta>>({})

  useEffect(() => {
    sessionStorage.setItem(`${STORAGE_KEY}_query`, query)
    sessionStorage.setItem(`${STORAGE_KEY}_results`, JSON.stringify(results))
    sessionStorage.setItem(`${STORAGE_KEY}_searched`, String(searched))
  }, [query, results, searched])

  useEffect(() => {
    if (!searched) {
      getTrending(tmdbLang(lang)).then(setTrending)
    }
  }, [searched, lang])

  useEffect(() => {
    if (!user?.uid) return
    ;(async () => {
      const [tmdbMap, watchedShowIds] = await Promise.all([
        getUserWatchlistTmdbMap(user.uid),
        getUserWatchedShowIds(user.uid),
      ])
      const initial: Record<number, ItemMeta> = {}
      tmdbMap.forEach((showId, tmdbId) => {
        initial[tmdbId] = { added: true, showId, watched: watchedShowIds.has(showId) }
      })
      setMetaMap(initial)
    })()
  }, [user?.uid])

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim()
    if (!term) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    const { results } = await searchMulti(term, tmdbLang(lang))
    setResults(results)
    setLoading(false)
  }, [lang])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await runSearch(query)
  }

  useEffect(() => {
    const id = setTimeout(() => { if (query.trim()) runSearch(query) }, 400)
    return () => clearTimeout(id)
  }, [query, runSearch])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setSearched(false)
    sessionStorage.removeItem(`${STORAGE_KEY}_query`)
    sessionStorage.removeItem(`${STORAGE_KEY}_results`)
    sessionStorage.removeItem(`${STORAGE_KEY}_searched`)
  }, [])

  return (
    <div className="space-y-8">
      <div className="bg-surface border-[3px] border-border shadow-brutal p-5 sm:p-7 space-y-5 animate-fade-in-up">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{t.discover.eyebrow}</div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase leading-none font-heading">{t.discover.title}</h1>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="search-query" className="sr-only">{t.discover.searchPlaceholder}</label>
          <div className="flex-1 relative">
            <input
              id="search-query"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.discover.searchPlaceholder}
              className="w-full border-[3px] border-border bg-surface px-4 py-3 text-sm font-bold uppercase outline-none focus:bg-yellow/30 pr-12 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 border-2 border-border px-2 py-1 text-xs font-bold bg-surface sm:hover:bg-pink transition-colors cursor-pointer"
                aria-label={t.discover.clear}
              >
                X
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="btn-brutal btn-accent w-full sm:w-auto"
            aria-label="Search"
          >
            {loading ? t.discover.loading : t.discover.searchButton}
          </button>
        </form>
      </div>

      {!searched && (
        <div className="text-center py-10">
          <p className="text-sm font-bold text-text-secondary">{t.discover.searchHint}</p>
        </div>
      )}

      {!searched && trending.length > 0 && (
        <section aria-labelledby="trending-heading">
          <SectionHeader id="trending-heading" title={t.discover.trending} />
          <DiscoverGrid items={trending} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
        </section>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="space-y-8">
          <EmptyState title={t.discover.noResults} />
          {trending.length > 0 && (
            <section aria-labelledby="suggestions-heading">
              <SectionHeader id="suggestions-heading" title={t.discover.suggestions} />
              <DiscoverGrid items={trending} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
            </section>
          )}
        </div>
      )}

      {results.length > 0 && (
        <section>
          <DiscoverGrid items={results} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
        </section>
      )}
    </div>
  )
}

function DiscoverGrid({ items, user, t, metaMap, setMetaMap }: {
  items: TmdbSearchResult[]
  user: ReturnType<typeof useAuth>['user']
  t: ReturnType<typeof useI18n>['t']
  metaMap: Record<number, ItemMeta>
  setMetaMap: (fn: (prev: Record<number, ItemMeta>) => Record<number, ItemMeta>) => void
}) {
  const [addingId, setAddingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [moviePrompt, setMoviePrompt] = useState<number | null>(null)

  const handleAdd = async (item: TmdbSearchResult) => {
    if (!user?.uid || addingId) return
    setAddingId(item.id)
    try {
      console.log('[handleAdd] step 1: getShowByTmdbId', item.id)
      const existing = await getShowByTmdbId(item.id)
      if (existing) {
        console.log('[handleAdd] step 2: addToWatchlist (existing)', existing.data.tmdb_id)
        const ok = await addToWatchlist(user.uid, existing.data.tmdb_id)
        if (ok) setMetaMap(m => ({ ...m, [item.id]: { added: true, showId: existing.data.tmdb_id } }))
        console.log('[handleAdd] done (existing)')
      } else {
        console.log('[handleAdd] step 2: createShowFromTmdb', item.id)
        const showId = await createShowFromTmdb(
          item.id,
          item.name || item.title || t.discover.unknown,
          item.poster_path,
          item.backdrop_path,
          item.overview,
          item.media_type as 'movie' | 'tv'
        )
        console.log('[handleAdd] step 3: addToWatchlist (new)', showId)
        const ok = await addToWatchlist(user.uid, showId)
        if (ok) setMetaMap(m => ({ ...m, [item.id]: { added: true, showId } }))
        console.log('[handleAdd] done (new)')
      }
    } catch (e) { console.error('[handleAdd] failed:', e) }
    setAddingId(null)
  }

  const handleRewatch = async (item: TmdbSearchResult) => {
    if (!user?.uid || togglingId || !metaMap[item.id]?.showId) return
    setTogglingId(item.id)
    setMoviePrompt(null)
    try {
      await toggleWatchedEpisode(user.uid, metaMap[item.id].showId!, metaMap[item.id].showId!, true)
      setMetaMap(m => ({
        ...m,
        [item.id]: {
          ...m[item.id],
          watched: true,
          watchedCount: (m[item.id]?.watchedCount ?? 1) + 1,
        },
      }))
    } catch (e) { console.error('handleRewatch failed:', e) }
    setTogglingId(null)
  }

  const handleUnwatch = async (item: TmdbSearchResult) => {
    if (!user?.uid || togglingId || !metaMap[item.id]?.showId) return
    setTogglingId(item.id)
    setMoviePrompt(null)
    try {
      await toggleWatchedEpisode(user.uid, metaMap[item.id].showId!, metaMap[item.id].showId!, false)
      setMetaMap(m => ({
        ...m,
        [item.id]: { ...m[item.id], watched: false, watchedCount: 0 },
      }))
    } catch (e) { console.error('handleUnwatch failed:', e) }
    setTogglingId(null)
  }

  return (
    <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-5 sm:items-stretch">
      {items.map(item => {
        const name = item.name || item.title || t.discover.unknown
        const imgSrc = getPosterUrl(item.poster_path)
        const year = (item.first_air_date || item.release_date || '').slice(0, 4)
        const meta = metaMap[item.id]
        const isAdded = meta?.added
        const isWatched = meta?.watched
        // Use negative TMDB ID to link to detail page even before saving
        const detailPath = meta?.showId ? `/show/${meta.showId}` : `/show/-${item.id}`
        const rating = item.vote_average != null && item.vote_average > 0 ? item.vote_average.toFixed(1) : null

        return (
          <div
            key={item.id}
            className="group bg-surface border-[3px] border-border card-lift flex flex-col h-full shadow-brutal"
          >
            <Link to={detailPath} className="block relative" aria-label={name}>
              <div className="aspect-[2/3] bg-surface-light border-b-[3px] border-border overflow-hidden">
                {imgSrc ? (
                  <img src={imgSrc} alt={`${name} poster`} className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3 text-center text-sm font-bold uppercase leading-tight">{name}</div>
                )}
              </div>
              <span className="absolute top-2 left-2 border-2 border-border bg-yellow px-1.5 py-0.5 text-[9px] font-bold uppercase">{item.media_type === 'movie' ? t.discover.movie : t.discover.tv}</span>
              {rating && (
                <span className="absolute top-2 right-2 border-2 border-border bg-surface px-1.5 py-0.5 text-[9px] font-bold" aria-label={`${t.showDetail.imdb} ${rating}`}>{rating}</span>
              )}
            </Link>

            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="min-w-0">
                <h3 className="font-bold text-xs uppercase leading-tight line-clamp-2">{name}</h3>
                {year && <div className="text-[10px] font-mono text-text-secondary mt-0.5">{year}</div>}
              </div>

              <div className="mt-auto">
                {!isAdded ? (
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={addingId === item.id}
                    className="w-full border-2 border-border bg-yellow text-text py-1.5 text-[10px] font-bold uppercase sm:hover:bg-orange transition-colors disabled:opacity-40 cursor-pointer"
                    aria-label={`${t.discover.addToDashboard} ${name}`}
                  >
                    {addingId === item.id ? '...' : t.discover.addToDashboard}
                  </button>
                ) : (
                  <>
                    {item.media_type === 'movie' ? (
                      <div className="relative">
                        <button
                          onClick={() => setMoviePrompt(item.id)}
                          disabled={togglingId === item.id}
                          className={`w-full border-2 border-border py-1.5 text-[10px] font-bold uppercase transition-colors disabled:opacity-40 cursor-pointer ${isWatched ? 'bg-yellow text-text' : 'bg-surface text-text sm:hover:bg-yellow'}`}
                          aria-label={isWatched ? t.showDetail.watched : t.showDetail.markAsWatched}
                        >
                          {togglingId === item.id ? '...' : isWatched ? `${t.showDetail.watched}${meta?.watchedCount && meta.watchedCount > 1 ? ` ×${meta.watchedCount}` : ''}` : t.showDetail.markAsWatched}
                        </button>
                        {moviePrompt === item.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMoviePrompt(null)} />
                            <div className="absolute bottom-full left-0 mb-1 w-full bg-surface border-[3px] border-border z-20 shadow-brutal-md">
                              <div className="relative">
                                <button
                                  onClick={() => setMoviePrompt(null)}
                                  className="x-btn absolute top-1 right-1 w-5 h-5 flex items-center justify-center border-2 border-border bg-surface text-text font-bold text-[9px] sm:hover:bg-pink transition-colors"
                                  aria-label="Close"
                                >
                                  X
                                </button>
                                <div className="px-3 pt-3 pb-2 space-y-2">
                                  <button
                                    onClick={() => handleUnwatch(item)}
                                    disabled={togglingId === item.id}
                                    className="w-full border-2 border-border px-2 py-1 text-[10px] font-bold uppercase bg-surface sm:hover:bg-pink transition-colors"
                                    aria-label="Mark as unwatched"
                                  >
                                    {t.showDetail.markAsUnwatched}
                                  </button>
                                  <button
                                    onClick={() => handleRewatch(item)}
                                    disabled={togglingId === item.id}
                                    className="w-full border-2 border-border px-2 py-1 text-[10px] font-bold uppercase bg-surface sm:hover:bg-yellow transition-colors"
                                    aria-label="Rewatch"
                                  >
                                    {t.showDetail.markAsWatched}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="w-full border-2 border-border bg-surface py-1.5 text-[10px] font-bold uppercase text-center text-text-secondary">
                        {t.watchlist.added}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
