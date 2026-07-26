import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  searchMulti, getPosterUrl, getTrending, tmdbLang,
  getOnTheAirTv, getUpcomingMovies,
  getAllGenres, discoverByGenre,
  type TmdbSearchResult, type TmdbGenre,
} from '../services/tmdb'
import { getShowByTmdbId, createShowFromTmdb, toggleWatchedEpisode, getUserWatchlistTmdbMap, getUserWatchedShowIds } from '../services/showService'
import { addToWatchlist } from '../services/watchlistService'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import EmptyState from '../components/EmptyState'
import SectionHeader from '../components/SectionHeader'

const STORAGE_KEY = 'discover_search'
type MediaFilter = 'all' | 'tv' | 'movie'
type DiscoveryTab = 'trending' | 'onAir' | 'upcoming' | 'genre'

interface ItemMeta { added: boolean; showId?: number; watched?: boolean; watchedCount?: number }

const GENRE_IDS = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37]
const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}

export default function DiscoverPage() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [query, setQuery] = useState(() => sessionStorage.getItem(`${STORAGE_KEY}_query`) || '')
  const [results, setResults] = useState<TmdbSearchResult[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(`${STORAGE_KEY}_results`) || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(() => sessionStorage.getItem(`${STORAGE_KEY}_searched`) === 'true')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('trending')
  const [trending, setTrending] = useState<TmdbSearchResult[]>([])
  const [onAir, setOnAir] = useState<TmdbSearchResult[]>([])
  const [upcoming, setUpcoming] = useState<TmdbSearchResult[]>([])
  const [genreResults, setGenreResults] = useState<TmdbSearchResult[]>([])
  const [genreLoading, setGenreLoading] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [genres, setGenres] = useState<TmdbGenre[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [metaMap, setMetaMap] = useState<Record<number, ItemMeta>>({})

  useEffect(() => {
    sessionStorage.setItem(`${STORAGE_KEY}_query`, query)
    sessionStorage.setItem(`${STORAGE_KEY}_results`, JSON.stringify(results))
    sessionStorage.setItem(`${STORAGE_KEY}_searched`, String(searched))
  }, [query, results, searched])

  // Load genres for quick filters
  useEffect(() => {
    getAllGenres(tmdbLang(lang)).then(setGenres)
  }, [lang])

  // Load trending/discovery sections
  const loadDiscovery = useCallback(async () => {
    const [trend, air, up] = await Promise.all([
      getTrending(tmdbLang(lang)),
      getOnTheAirTv(tmdbLang(lang)),
      getUpcomingMovies(tmdbLang(lang)),
    ])
    setTrending(trend)
    setOnAir(air)
    setUpcoming(up.map(m => ({ ...m, media_type: 'movie', release_date: m.release_date ?? undefined })))
  }, [lang])

  useEffect(() => { loadDiscovery() }, [loadDiscovery])

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

  const handleGenreClick = useCallback(async (genreId: number) => {
    setQuery('')
    setResults([])
    setSearched(false)
    const isToggling = genreId === selectedGenre
    setSelectedGenre(isToggling ? null : genreId)
    if (!isToggling) {
      setGenreLoading(true)
      try {
        const [movieRes, tvRes] = await Promise.all([
          discoverByGenre(genreId, 'movie', tmdbLang(lang)),
          discoverByGenre(genreId, 'tv', tmdbLang(lang)),
        ])
        const merged = [...movieRes.results, ...tvRes.results]
          .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
          .slice(0, 20)
        setGenreResults(merged)
      } catch { setGenreResults([]) }
      setGenreLoading(false)
    } else {
      setGenreResults([])
    }
  }, [selectedGenre, lang])

  const handleSuggestionClick = useCallback((term: string) => {
    setQuery(term)
    runSearch(term)
    setIsFocused(false)
  }, [runSearch])

  const filteredResults = useMemo(() => {
    if (mediaFilter === 'all') return results
    return results.filter(r => r.media_type === mediaFilter)
  }, [results, mediaFilter])

  const hasActiveDiscovery = discoveryTab === 'genre' && selectedGenre

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Search Header */}
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
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
            {/* Search suggestions dropdown */}
            {isFocused && !query && trending.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border-[3px] border-border z-20 shadow-brutal-md">
                <div className="px-3 py-1.5 text-[9px] font-bold uppercase text-text-secondary border-b-2 border-border">
                  {t.discover.trending}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {trending.slice(0, 6).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSuggestionClick(item.name || item.title || '')}
                      className="w-full text-left px-3 py-2 text-xs font-bold uppercase border-b-2 border-border last:border-b-0 sm:hover:bg-yellow transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="w-5 h-5 border border-border flex items-center justify-center text-[8px] font-bold shrink-0 bg-surface">
                        {item.media_type === 'movie' ? 'M' : 'TV'}
                      </span>
                      <span className="truncate">{item.name || item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
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

        {/* Media type filter */}
        {searched && results.length > 0 && (
          <div className="flex gap-1 sm:gap-2 border-t-2 border-border pt-4">
            {(['all', 'tv', 'movie'] as MediaFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setMediaFilter(f)}
                className={`border-2 border-border px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  mediaFilter === f ? 'bg-yellow text-text' : 'bg-surface sm:hover:bg-yellow'
                }`}
                aria-pressed={mediaFilter === f}
              >
                {f === 'all' ? t.discover.all : f === 'tv' ? t.discover.tv : t.discover.movie}
                <span className="ml-1 border-l-2 border-border pl-1 text-text-secondary">
                  {f === 'all' ? results.length : results.filter(r => r.media_type === f).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Genre quick filters */}
        <div className="border-t-2 border-border pt-3">
          <div className="text-[9px] font-bold uppercase text-text-secondary mb-2">{t.discover.browseByGenre}</div>
          <div className="flex flex-wrap gap-1.5">
            {GENRE_IDS.map(id => {
              const genreName = genres.find(g => g.id === id)?.name || GENRE_NAMES[id]
              if (!genreName) return null
              return (
                <button
                  key={id}
                  onClick={() => handleGenreClick(id)}
                  className={`border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    selectedGenre === id ? 'bg-yellow text-text' : 'bg-surface sm:hover:bg-yellow'
                  }`}
                  aria-label={`${t.discover.browseByGenre}: ${genreName}`}
                >
                  {genreName}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Discovery section tabs (when no search active and no genre selected) */}
      {!searched && !hasActiveDiscovery && (
        <>
          {/* Tab navigation */}
          <div className="flex border-b-[3px] border-border gap-0">
            {([
              { key: 'trending' as DiscoveryTab, label: t.discover.trending },
              { key: 'onAir' as DiscoveryTab, label: t.discover.onTheAir },
              { key: 'upcoming' as DiscoveryTab, label: t.discover.upcoming },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setDiscoveryTab(tab.key)}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase border-t-[3px] border-l-[3px] border-r-[3px] border-border -mb-[3px] transition-colors cursor-pointer ${
                  discoveryTab === tab.key ? 'bg-yellow text-text' : 'bg-surface text-text-secondary sm:hover:bg-yellow'
                }`}
                aria-pressed={discoveryTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {discoveryTab === 'trending' && trending.length > 0 && (
            <section>
              <DiscoverGrid items={trending} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
            </section>
          )}
          {discoveryTab === 'onAir' && onAir.length > 0 && (
            <section>
              <DiscoverGrid items={onAir} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
            </section>
          )}
          {discoveryTab === 'upcoming' && upcoming.length > 0 && (
            <section>
              <DiscoverGrid items={upcoming} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
            </section>
          )}
        </>
      )}

      {/* Genre discovery results */}
      {!searched && hasActiveDiscovery && (
        <section>
          {genreLoading ? (
            <div className="text-center py-10">
              <p className="text-sm font-bold text-text-secondary">{t.discover.loading}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm sm:text-lg font-black uppercase font-heading">
                  {genres.find(g => g.id === selectedGenre)?.name || GENRE_NAMES[selectedGenre!] || ''}
                </h2>
                <button
                  onClick={() => { setSelectedGenre(null); setGenreResults([]) }}
                  className="border-2 border-border px-2 py-1 text-[10px] font-bold uppercase bg-surface sm:hover:bg-pink transition-colors cursor-pointer"
                >
                  X {t.discover.clear}
                </button>
              </div>
              <DiscoverGrid items={genreResults} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
            </>
          )}
        </section>
      )}

      {/* Empty search state */}
      {!searched && !hasActiveDiscovery && trending.length === 0 && onAir.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm font-bold text-text-secondary">{t.discover.searchHint}</p>
        </div>
      )}

      {/* No search results */}
      {searched && !loading && filteredResults.length === 0 && (
        <div className="space-y-8">
          <EmptyState title={t.discover.noResults} />
          {trending.length > 0 && (
            <section>
              <SectionHeader id="suggestions-heading" title={t.discover.suggestions} />
              <DiscoverGrid items={trending} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
            </section>
          )}
        </div>
      )}

      {/* Search results */}
      {filteredResults.length > 0 && (
        <section>
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-3">
            {filteredResults.length} {t.history.episodes}
          </div>
          <DiscoverGrid items={filteredResults} user={user} t={t} metaMap={metaMap} setMetaMap={setMetaMap} />
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
      const existing = await getShowByTmdbId(item.id)
      if (existing) {
        const ok = await addToWatchlist(user.uid, existing.data.tmdb_id)
        if (ok) setMetaMap(m => ({ ...m, [item.id]: { added: true, showId: existing.data.tmdb_id } }))
      } else {
        const showId = await createShowFromTmdb(
          item.id,
          item.name || item.title || t.discover.unknown,
          item.poster_path,
          item.backdrop_path,
          item.overview,
          item.media_type as 'movie' | 'tv'
        )
        const ok = await addToWatchlist(user.uid, showId)
        if (ok) setMetaMap(m => ({ ...m, [item.id]: { added: true, showId } }))
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
    <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9.5rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-3 max-sm:scrollbar-none sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-5 sm:items-stretch">
      {items.map(item => {
        const name = item.name || item.title || t.discover.unknown
        const imgSrc = getPosterUrl(item.poster_path)
        const year = (item.first_air_date || item.release_date || '').slice(0, 4)
        const meta = metaMap[item.id]
        const isAdded = meta?.added
        const isWatched = meta?.watched
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
                {year && <div className="text-[9px] sm:text-[10px] font-mono text-text-secondary mt-0.5">{year}</div>}
              </div>

              <div className="mt-auto">
                {!isAdded ? (
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={addingId === item.id}
                    className="w-full border-2 border-border bg-yellow text-text py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold uppercase sm:hover:bg-orange transition-colors disabled:opacity-40 cursor-pointer"
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
                          className={`w-full border-2 border-border py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold uppercase transition-colors disabled:opacity-40 cursor-pointer ${isWatched ? 'bg-yellow text-text' : 'bg-surface text-text sm:hover:bg-yellow'}`}
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
                                    className="w-full border-2 border-border px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase bg-surface sm:hover:bg-pink transition-colors"
                                    aria-label="Mark as unwatched"
                                  >
                                    {t.showDetail.markAsUnwatched}
                                  </button>
                                  <button
                                    onClick={() => handleRewatch(item)}
                                    disabled={togglingId === item.id}
                                    className="w-full border-2 border-border px-2 py-1 text-[9px] sm:text-[10px] font-bold uppercase bg-surface sm:hover:bg-yellow transition-colors"
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
                      <div className="w-full border-2 border-border bg-surface py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold uppercase text-center text-text-secondary">
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
