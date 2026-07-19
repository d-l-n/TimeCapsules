const TRAKT_API_BASE = '/api/trakt'
const TRAKT_AUTH_BASE = 'https://trakt.tv'

export interface TraktMovie {
  title: string
  year: number
  ids: { trakt: number; slug: string; imdb: string | null; tmdb: number | null }
}

export interface TraktShow {
  title: string
  year: number
  ids: { trakt: number; slug: string; imdb: string | null; tmdb: number | null; tvdb: number | null }
}

export interface TraktEpisode {
  season: number
  number: number
  title: string
  ids: { trakt: number; imdb: string | null; tmdb: number | null; tvdb: number | null }
}

export interface TraktHistoryItem {
  id: number
  watched_at: string
  action: string
  type: string
  movie?: TraktMovie
  show?: TraktShow
  episode?: TraktEpisode
}

export interface TraktRatingItem {
  rated_at: string
  rating: number
  type: string
  movie?: TraktMovie
  show?: TraktShow
  episode?: TraktEpisode
}

export interface TraktWatchlistItem {
  id: number
  listed_at: string
  type: string
  movie?: TraktMovie
  show?: TraktShow
}

export interface TraktList {
  id: number
  name: string
  description: string
  privacy: string
  item_count: number
  ids: { trakt: number; slug: string }
}

export interface TraktListDetail {
  name: string
  description: string
  privacy: string
  updated_at: string
  item_count: number
}

export interface TraktListItem {
  id: number
  type: string
  movie?: TraktMovie
  show?: TraktShow
}

function getHeaders(clientId: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': clientId,
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

/** Build OAuth authorization URL for Trakt */
export function getAuthUrl(clientId: string, redirectUri: string): string {
  return `${TRAKT_AUTH_BASE}/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
}

/** Exchange OAuth code for access token (requires client secret — call from Worker/server) */
export async function exchangeCode(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<{ access_token: string; refresh_token: string; created_at: number; expires_in: number } | null> {
  const res = await fetch(`${TRAKT_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) return null
  return res.json()
}

/** Refresh an expired access token */
export async function refreshToken(clientId: string, clientSecret: string, refreshToken: string): Promise<{ access_token: string; refresh_token: string; created_at: number; expires_in: number } | null> {
  const res = await fetch(`${TRAKT_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json()
}

/** Fetch user's watch history (movies + episodes) */
export async function getHistory(clientId: string, token: string, type: 'movies' | 'episodes' = 'episodes', page = 1, limit = 200): Promise<TraktHistoryItem[]> {
  const res = await fetch(`${TRAKT_API_BASE}/sync/history/${type}?page=${page}&limit=${limit}`, {
    headers: getHeaders(clientId, token),
  })
  if (!res.ok) return []
  return res.json()
}

/** Fetch user's ratings */
export async function getRatings(clientId: string, token: string, type: 'movies' | 'shows' | 'episodes' = 'episodes', page = 1, limit = 200): Promise<TraktRatingItem[]> {
  const res = await fetch(`${TRAKT_API_BASE}/sync/ratings/${type}?page=${page}&limit=${limit}`, {
    headers: getHeaders(clientId, token),
  })
  if (!res.ok) return []
  return res.json()
}

/** Fetch user's watchlist */
export async function getWatchlist(clientId: string, token: string, type: 'movies' | 'shows' = 'movies', page = 1, limit = 200): Promise<TraktWatchlistItem[]> {
  const res = await fetch(`${TRAKT_API_BASE}/sync/watchlist/${type}?page=${page}&limit=${limit}`, {
    headers: getHeaders(clientId, token),
  })
  if (!res.ok) return []
  return res.json()
}

/** Fetch user's custom lists */
export async function getLists(clientId: string, token: string, username: string): Promise<TraktList[]> {
  const res = await fetch(`${TRAKT_API_BASE}/users/${username}/lists`, {
    headers: getHeaders(clientId, token),
  })
  if (!res.ok) return []
  return res.json()
}

/** Fetch items in a specific list */
export async function getListItems(clientId: string, token: string, username: string, listId: number): Promise<TraktListItem[]> {
  const res = await fetch(`${TRAKT_API_BASE}/users/${username}/lists/${listId}/items`, {
    headers: getHeaders(clientId, token),
  })
  if (!res.ok) return []
  return res.json()
}

/** Fetch user profile (to get username) */
export async function getUserSettings(clientId: string, token: string): Promise<{ user: { ids: { slug: string }; name: string; username: string } } | null> {
  const res = await fetch(`${TRAKT_API_BASE}/users/settings`, {
    headers: getHeaders(clientId, token),
  })
  if (!res.ok) return null
  return res.json()
}

/** Test if the connection is valid */
export async function testConnection(clientId: string, token: string): Promise<boolean> {
  const res = await fetch(`${TRAKT_API_BASE}/users/settings`, {
    headers: getHeaders(clientId, token),
  })
  return res.ok
}

/** Map Trakt history item to Firestore watched_episode format */
export function mapHistoryToWatchedEpisode(uid: string, item: TraktHistoryItem, showTvTimeId: number): { user_id: string; episode_id: number; show_id: number; watched_at: string } | null {
  if (item.type !== 'episode' || !item.episode) return null
  // Use negative episode ID to indicate it's from Trakt (synthetic, like TMDB episodes)
  const episodeId = -(item.episode.ids.trakt)
  return {
    user_id: uid,
    episode_id: episodeId,
    show_id: showTvTimeId,
    watched_at: item.watched_at,
  }
}

/** Map Trakt rating to Firestore rating format */
export function mapRating(uid: string, item: TraktRatingItem, showTvTimeId: number): { user_id: string; show_id: number; rating: number; rated_at: string } | null {
  if (item.type !== 'movie' && item.type !== 'show') return null
  return {
    user_id: uid,
    show_id: showTvTimeId,
    rating: item.rating,
    rated_at: item.rated_at,
  }
}

/** Map Trakt watchlist item to Firestore watchlist format */
export function mapWatchlistItem(uid: string, item: TraktWatchlistItem, showTvTimeId: number): { user_id: string; show_id: number; added_at: string } | null {
  if (item.type !== 'movie' && item.type !== 'show') return null
  return {
    user_id: uid,
    show_id: showTvTimeId,
    added_at: item.listed_at,
  }
}
