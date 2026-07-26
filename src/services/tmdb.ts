const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p'
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || ''

export function getTmdbImage(path: string | null, size: 'w500' | 'original' = 'w500'): string | null {
  if (!path) return null
  return `${TMDB_IMG_BASE}/${size}${path}`
}

export function getPosterUrl(posterPath: string | null): string | null {
  return getTmdbImage(posterPath, 'w500')
}

export interface TmdbSearchResult {
  id: number
  name?: string
  title?: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string | null
  first_air_date?: string
  release_date?: string
  vote_average?: number
  media_type?: string
}

export interface SearchMultiResult {
  results: TmdbSearchResult[]
  total_pages: number
}

export async function searchMulti(query: string, language = 'en-US', page = 1): Promise<SearchMultiResult> {
  if (!query.trim()) return { results: [], total_pages: 0 }
  const url = `${TMDB_API_BASE}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${language}&page=${page}&include_adult=false`
  const res = await fetch(url)
  if (!res.ok) return { results: [], total_pages: 0 }
  const data = await res.json() as { results: TmdbSearchResult[]; total_pages: number }
  return {
    results: (data.results || []).filter(r => r.media_type === 'tv' || r.media_type === 'movie'),
    total_pages: data.total_pages || 0,
  }
}

export interface TmdbSeasonInfo {
  season_number: number
  episode_count: number
  name: string
}

export interface TmdbSeasonEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string | null
  still_path: string | null
  air_date: string | null
}

export interface TmdbCollectionInfo {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
}

export interface TmdbDetails {
  id: number
  name?: string
  title?: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string | null
  vote_average: number
  number_of_seasons?: number
  number_of_episodes?: number
  seasons?: TmdbSeasonInfo[]
  belongs_to_collection?: TmdbCollectionInfo | null
  first_air_date?: string
  release_date?: string
  genres?: { id: number; name: string }[]
  status?: string
  runtime?: number
  external_ids: {
    imdb_id: string | null
    tvdb_id: number | null
  }
}

export function tmdbLang(lang: string): string {
  return lang === 'es' ? 'es-ES' : 'en-US'
}

export async function getTmdbSeason(tmdbId: number, seasonNumber: number, language = 'en-US'): Promise<TmdbSeasonEpisode[]> {
  const url = `${TMDB_API_BASE}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=${language}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { episodes?: TmdbSeasonEpisode[] }
  return data.episodes ?? []
}

export async function getTmdbAllEpisodes(tmdbId: number, seasons: TmdbSeasonInfo[], language = 'en-US'): Promise<TmdbSeasonEpisode[]> {
  const seasonNumbers = seasons.filter(s => s.season_number > 0 && s.episode_count > 0).map(s => s.season_number)
  const promises = seasonNumbers.map(sn => getTmdbSeason(tmdbId, sn, language))
  const results = await Promise.all(promises)
  return results.flat()
}

export async function getTmdbDetails(tmdbId: number, mediaType: 'tv' | 'movie' = 'tv', language = 'en-US'): Promise<TmdbDetails | null> {
  const url = `${TMDB_API_BASE}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=${language}&append_to_response=external_ids`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

/**
 * Try both tv and movie types in parallel and return details from whichever succeeds.
 * Returns `{ details, mediaType }` if either endpoint works, or `null` if both fail.
 */
export async function getTmdbDetailsAuto(tmdbId: number, language = 'en-US'): Promise<{ details: TmdbDetails; mediaType: 'tv' | 'movie' } | null> {
  const [tvResult, movieResult] = await Promise.all([
    getTmdbDetails(tmdbId, 'tv', language),
    getTmdbDetails(tmdbId, 'movie', language),
  ])
  if (tvResult) return { details: tvResult, mediaType: 'tv' }
  if (movieResult) return { details: movieResult, mediaType: 'movie' }
  return null
}

export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

export interface WatchProvidersResult {
  providers: WatchProvider[]
  link: string | null
}

interface TmdbWatchResponse {
  results?: Record<string, { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[]; link?: string }>
}

export interface TmdbCollectionPart {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
}

export async function getSimilar(tmdbId: number, mediaType: 'tv' | 'movie' = 'tv', language = 'en-US'): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_API_BASE}/${mediaType}/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=${language}&page=1`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { results: TmdbSearchResult[] }
  return (data.results || []).slice(0, 8)
}

export async function getTrending(language = 'en-US'): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_API_BASE}/trending/all/week?api_key=${TMDB_API_KEY}&language=${language}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { results: TmdbSearchResult[] }
  return (data.results || []).filter(r => r.media_type === 'tv' || r.media_type === 'movie').slice(0, 10)
}

export async function getRecommended(tmdbId: number, mediaType: 'tv' | 'movie' = 'tv', language = 'en-US'): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_API_BASE}/${mediaType}/${tmdbId}/recommendations?api_key=${TMDB_API_KEY}&language=${language}&page=1`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { results: TmdbSearchResult[] }
  return (data.results || []).slice(0, 8)
}

export async function getTmdbCollection(collectionId: number, language = 'en-US'): Promise<TmdbCollectionPart[]> {
  const url = `${TMDB_API_BASE}/collection/${collectionId}?api_key=${TMDB_API_KEY}&language=${language}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { parts?: TmdbCollectionPart[] }
  return data.parts ?? []
}

export async function getWatchProviders(tmdbId: number, mediaType: 'tv' | 'movie' = 'tv', country = 'AR'): Promise<WatchProvidersResult | null> {
  const url = `${TMDB_API_BASE}/${mediaType}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as TmdbWatchResponse
  const results = data.results
  if (!results) return null
  const byCountry = results[country] || results.US || Object.values(results)[0]
  if (!byCountry) return null
  const providers = byCountry.flatrate || byCountry.buy || byCountry.rent || null
  if (!providers) return null
  return { providers, link: byCountry.link || null }
}

export interface NextEpisodeToAir {
  id: number
  name: string
  episode_number: number
  season_number: number
  air_date: string | null
  still_path: string | null
  overview: string | null
}

export interface TmdbTvDetails extends TmdbDetails {
  next_episode_to_air: NextEpisodeToAir | null
  last_episode_to_air: NextEpisodeToAir | null
  status: string
  in_production: boolean
}

export interface UpcomingMovie {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string | null
  release_date: string | null
  vote_average: number
  media_type: string
}

export async function getTvNextEpisode(tmdbId: number, language = 'en-US'): Promise<TmdbTvDetails | null> {
  const badKey = `tmdb_bad_tv_${tmdbId}`
  if (localStorage.getItem(badKey)) return null
  const url = `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=${language}&append_to_response=external_ids`
  const res = await fetch(url)
  if (!res.ok) {
    localStorage.setItem(badKey, '1')
    return null
  }
  return res.json()
}

export async function getUpcomingMovies(language = 'en-US', page = 1): Promise<UpcomingMovie[]> {
  const url = `${TMDB_API_BASE}/movie/upcoming?api_key=${TMDB_API_KEY}&language=${language}&page=${page}&region=US`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { results: UpcomingMovie[] }
  return (data.results || []).slice(0, 20)
}

export async function getOnTheAirTv(language = 'en-US'): Promise<TmdbSearchResult[]> {
  const url = `${TMDB_API_BASE}/tv/on_the_air?api_key=${TMDB_API_KEY}&language=${language}&page=1`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { results: TmdbSearchResult[] }
  return (data.results || []).slice(0, 20)
}

export interface TmdbGenre {
  id: number
  name: string
}

const genreCache = new Map<string, TmdbGenre[]>()

export async function getMovieGenres(language = 'en-US'): Promise<TmdbGenre[]> {
  const key = `movie_${language}`
  if (genreCache.has(key)) return genreCache.get(key)!
  const url = `${TMDB_API_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}&language=${language}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { genres: TmdbGenre[] }
  const genres = data.genres || []
  genreCache.set(key, genres)
  return genres
}

export async function getTvGenres(language = 'en-US'): Promise<TmdbGenre[]> {
  const key = `tv_${language}`
  if (genreCache.has(key)) return genreCache.get(key)!
  const url = `${TMDB_API_BASE}/genre/tv/list?api_key=${TMDB_API_KEY}&language=${language}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { genres: TmdbGenre[] }
  const genres = data.genres || []
  genreCache.set(key, genres)
  return genres
}

export async function getAllGenres(language = 'en-US'): Promise<TmdbGenre[]> {
  const [movie, tv] = await Promise.all([getMovieGenres(language), getTvGenres(language)])
  const seen = new Set<number>()
  return [...movie, ...tv].filter(g => {
    if (seen.has(g.id)) return false
    seen.add(g.id)
    return true
  })
}

export async function discoverByGenre(genreId: number, mediaType: 'movie' | 'tv', language = 'en-US', page = 1): Promise<SearchMultiResult> {
  const url = `${TMDB_API_BASE}/discover/${mediaType}?api_key=${TMDB_API_KEY}&language=${language}&sort_by=popularity.desc&with_genres=${genreId}&page=${page}&include_adult=false`
  const res = await fetch(url)
  if (!res.ok) return { results: [], total_pages: 0 }
  const data = await res.json() as { results: TmdbSearchResult[]; total_pages: number }
  return {
    results: (data.results || []).map(r => ({ ...r, media_type: mediaType })),
    total_pages: data.total_pages || 0,
  }
}

const PROVIDER_URLS: Record<number, string> = {
  8: 'https://www.netflix.com/search?q=',
  9: 'https://www.amazon.com/s?k=',
  15: 'https://www.hulu.com/search?q=',
  119: 'https://www.amazon.com/s?k=',
  1899: 'https://www.max.com/search?q=',
  384: 'https://www.max.com/search?q=',
  337: 'https://www.disneyplus.com/search?q=',
  350: 'https://tv.apple.com/search?term=',
  531: 'https://www.paramountplus.com/search/?keyword=',
  619: 'https://www.disneyplus.com/search?q=',
  2: 'https://www.apple.com/search?q=',
  3: 'https://tv.apple.com/search?term=',
  283: 'https://www.crunchyroll.com/search?q=',
  257: 'https://www.filmin.es/search?q=',
}

export function getProviderDirectLink(providerId: number, showName: string, _country: string): string | null {
  const base = PROVIDER_URLS[providerId]
  if (!base) return null
  return base + encodeURIComponent(showName)
}
