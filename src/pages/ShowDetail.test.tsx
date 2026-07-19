import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mock all external dependencies ────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: '1' })),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock('../lib/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/I18nContext', () => ({ useI18n: vi.fn() }))

vi.mock('../hooks', () => ({
  useGroups: vi.fn(() => ({ groups: [] })),
  useWatchlistStatus: vi.fn(() => ({ inWatchlist: false, loading: false, setInWatchlist: vi.fn() })),
  useSpoilerFree: vi.fn(() => [false, vi.fn()]),
}))

vi.mock('../services/showService', () => ({
  getShowById: vi.fn(),
  getEpisodesByShow: vi.fn(),
  getRatingForShow: vi.fn(),
  getWatchedEpisodesForShow: vi.fn(),
  toggleWatchedEpisode: vi.fn(),
  getResumePositions: vi.fn(),
  setResumePosition: vi.fn(),
  getShowByTmdbId: vi.fn(),
  createShowFromTmdb: vi.fn(),
  addFollowedShow: vi.fn(),
  setRating: vi.fn(),
}))

vi.mock('../services/tmdb', () => ({
  getTmdbDetails: vi.fn(),
  getTmdbDetailsAuto: vi.fn(),
  getTmdbAllEpisodes: vi.fn(() => Promise.resolve([])),
  getWatchProviders: vi.fn(() => Promise.resolve(null)),
  getTmdbImage: vi.fn(() => null),
  getTmdbCollection: vi.fn(() => Promise.resolve([])),
  getSimilar: vi.fn(() => Promise.resolve([])),
  getRecommended: vi.fn(() => Promise.resolve([])),
  tmdbLang: vi.fn(() => 'en-US'),
}))

vi.mock('../services/groupService', () => ({
  getGroupMembers: vi.fn(() => Promise.resolve([])),
  getGroupEpisodeProgress: vi.fn(() => Promise.resolve([])),
  createGroupWatchEvent: vi.fn(),
  listenToGroupWatchEvents: vi.fn(() => vi.fn()),
}))

vi.mock('../services/watchlistService', () => ({
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}))

vi.mock('../services/listService', () => ({
  getUserLists: vi.fn(() => Promise.resolve([])),
  addShowToList: vi.fn(),
  removeShowFromList: vi.fn(),
}))

vi.mock('../services/emotionService', () => ({
  getEmotionsForShow: vi.fn(() => Promise.resolve(new Map())),
  getEmoji: vi.fn(() => '😊'),
}))

vi.mock('../lib/firebase', () => ({ db: 'mock-db' }))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc'),
  setDoc: vi.fn(() => Promise.resolve()),
}))

// ── Dynamic imports (post-mock) ────────────────────────
const { useParams } = await import('react-router-dom')
const authModule = await import('../lib/AuthContext')
const i18nModule = await import('../lib/I18nContext')
const hooksModule = await import('../hooks')
const showServiceModule = await import('../services/showService')
const tmdbModule = await import('../services/tmdb')
const { default: ShowDetail } = await import('./ShowDetail')

// ── Translations fixture ───────────────────────────────
const enT = {
  app: { name: 'TIME CAPSULES' },
  showDetail: {
    loading: 'LOADING...',
    notFound: 'SHOW NOT FOUND',
    back: 'BACK',
    yourRating: 'YOUR RATING',
    season: 'SEASON',
    episode: 'Episode',
    markAsWatched: 'MARK AS WATCHED',
    markAsUnwatched: 'MARK AS UNWATCHED',
    watched: 'WATCHED',
    noProviders: 'No streaming info available.',
    streamOn: 'Stream on',
    streamCountry: 'Country',
    imdb: 'IMDb',
    votes: 'votes',
    clearRating: 'CLEAR',
    resumePosition: 'Resume',
    setPosition: 'Set position',
    noPosition: '-',
    remaining: 'Remaining',
    allCaughtUp: 'ALL CAUGHT UP!',
    left: 'left',
  },
  watchlist: { title: 'Watchlist', add: 'ADD TO WATCHLIST', added: 'IN WATCHLIST' },
  lists: { addToList: 'ADD TO LIST', noLists: 'No lists' },
  watchParty: {
    selectGroup: 'Switch Group',
    watchingTogether: 'Watching together',
    justMe: 'Just me',
    activity: 'Group Activity',
    noActivity: 'No activity yet',
    watchedEpisode: 'watched {episode}',
    aMember: 'A member',
    groupProgress: 'Group Progress',
  },
  groups: { you: 'You' },
  discover: { movie: 'MOVIE', tv: 'TV' },
}

const mockUser = { uid: 'user-1', email: 'test@test.com' } as any

const mockShow = {
  tmdb_id: 1,
  name: 'Breaking Bad',
  poster_url: '/poster.jpg',
  backdrop_url: '/backdrop.jpg',
  synopsis: 'A high school chemistry teacher turned meth manufacturer.',
  imdb_rating: 9.5,
  imdb_votes: 1500000,
  imdb_id: 'tt0903747',
  media_type: 'tv' as const,
  episode_run_time: [45, 48],
}

const mockEpisode = {
  tmdb_id: 101,
  show_id: 1,
  season_number: 1,
  episode_number: 1,
  title: 'Pilot',
}

const mockMovieShow = {
  ...mockShow,
  media_type: 'movie' as const,
  name: 'The Matrix',
}

function renderShowDetail() {
  return render(
    <MemoryRouter>
      <ShowDetail />
    </MemoryRouter>,
  )
}

describe('ShowDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    vi.mocked(useParams).mockReturnValue({ id: '1' })
    vi.mocked(authModule.useAuth).mockReturnValue({ user: mockUser, loading: false } as any)
    vi.mocked(i18nModule.useI18n).mockReturnValue({ t: enT, lang: 'en', setLang: vi.fn() } as any)
    vi.mocked(hooksModule.useSpoilerFree).mockReturnValue([false, vi.fn()])

    // Default: show found, TV type, no episodes
    vi.mocked(showServiceModule.getShowById).mockResolvedValue(mockShow)
    vi.mocked(showServiceModule.getEpisodesByShow).mockResolvedValue([])
    vi.mocked(showServiceModule.getWatchedEpisodesForShow).mockResolvedValue(new Map())
    vi.mocked(showServiceModule.getResumePositions).mockResolvedValue(new Map())
    vi.mocked(showServiceModule.getRatingForShow).mockResolvedValue(null)
    vi.mocked(tmdbModule.getTmdbDetailsAuto).mockResolvedValue({
      details: {
        id: 1,
        name: 'Breaking Bad',
        seasons: [{ season_number: 1, episode_count: 7, name: 'Season 1' }],
        external_ids: { imdb_id: 'tt0903747', tvdb_id: null },
        overview: mockShow.synopsis,
        poster_path: null,
        backdrop_path: null,
        vote_average: 9.5,
        number_of_seasons: 5,
        number_of_episodes: 62,
      } as any,
      mediaType: 'tv' as const,
    })
    vi.mocked(tmdbModule.getWatchProviders).mockResolvedValue(null)
    vi.mocked(tmdbModule.getSimilar).mockResolvedValue([])
    vi.mocked(tmdbModule.getRecommended).mockResolvedValue([])
  })

  // ── Loading State ────────────────────────────────────
  it('shows loading spinner initially', () => {
    vi.mocked(showServiceModule.getShowById).mockReturnValue(new Promise(() => {}))
    renderShowDetail()
    expect(screen.getByText('LOADING...')).toBeInTheDocument()
  })

  // ── Not Found State ──────────────────────────────────
  it('shows not found state when show does not exist', async () => {
    vi.mocked(showServiceModule.getShowById).mockResolvedValue(null)
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('SHOW NOT FOUND')).toBeInTheDocument())
  })

  it('shows back link when show not found', async () => {
    vi.mocked(showServiceModule.getShowById).mockResolvedValue(null)
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('BACK')).toBeInTheDocument())
  })

  // ── TV Show Display ──────────────────────────────────
  it('renders show name as heading', async () => {
    vi.mocked(showServiceModule.getEpisodesByShow).mockResolvedValue([mockEpisode])
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument())
  })

  it('renders synopsis when available', async () => {
    renderShowDetail()
    await waitFor(() => expect(screen.getByText(/A high school chemistry teacher/)).toBeInTheDocument())
  })

  it('shows IMDb rating', async () => {
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('9.5')).toBeInTheDocument())
  })

  it('shows your rating button with question mark by default', async () => {
    renderShowDetail()
    await waitFor(() => {
      expect(screen.getByText(/YOUR RATING/)).toBeInTheDocument()
      expect(screen.getByText(/\?\/10/)).toBeInTheDocument()
    })
  })

  it('shows ADD TO WATCHLIST button', async () => {
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('ADD TO WATCHLIST')).toBeInTheDocument())
  })

  it('shows ADD TO LIST button', async () => {
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('ADD TO LIST')).toBeInTheDocument())
  })

  // ── Movie Display ────────────────────────────────────
  it('shows MARK AS WATCHED button for movies', async () => {
    vi.mocked(showServiceModule.getShowById).mockResolvedValue(mockMovieShow)
    vi.mocked(tmdbModule.getTmdbDetailsAuto).mockResolvedValue({
      details: {
        id: 1, title: 'The Matrix', poster_path: null, backdrop_path: null,
        vote_average: 8.7, external_ids: { imdb_id: 'tt0133093', tvdb_id: null },
        overview: null, name: 'The Matrix',
      },
      mediaType: 'movie' as const,
    })
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('MARK AS WATCHED')).toBeInTheDocument())
  })

  it('shows resume position dash for movies by default', async () => {
    vi.mocked(showServiceModule.getShowById).mockResolvedValue(mockMovieShow)
    vi.mocked(tmdbModule.getTmdbDetailsAuto).mockResolvedValue({
      details: {
        id: 1, title: 'The Matrix', poster_path: null, backdrop_path: null,
        vote_average: 8.7, external_ids: { imdb_id: 'tt0133093', tvdb_id: null },
        overview: null, name: 'The Matrix',
      },
      mediaType: 'movie' as const,
    })
    renderShowDetail()
    await waitFor(() => expect(screen.getByText(/\u0040 -/)).toBeInTheDocument())
  })

  it('does not show SEASON text for movies', async () => {
    vi.mocked(showServiceModule.getShowById).mockResolvedValue(mockMovieShow)
    vi.mocked(tmdbModule.getTmdbDetailsAuto).mockResolvedValue({
      details: {
        id: 1, title: 'The Matrix', poster_path: null, backdrop_path: null,
        vote_average: 8.7, external_ids: { imdb_id: 'tt0133093', tvdb_id: null },
        overview: null, name: 'The Matrix',
      },
      mediaType: 'movie' as const,
    })
    renderShowDetail()
    await waitFor(() => expect(screen.queryByText('SEASON')).not.toBeInTheDocument())
  })

  // ── Episodes ─────────────────────────────────────────
  it('shows SEASON section for TV shows with episodes', async () => {
    vi.mocked(showServiceModule.getEpisodesByShow).mockResolvedValue([mockEpisode])
    renderShowDetail()
    await waitFor(() => expect(screen.getByText(/SEASON 1/)).toBeInTheDocument())
  })

  it('shows episode title for existing episodes', async () => {
    vi.mocked(showServiceModule.getEpisodesByShow).mockResolvedValue([mockEpisode])
    renderShowDetail()
    await waitFor(() => expect(screen.getByText('Pilot')).toBeInTheDocument())
  })

  // ── Backdrop ─────────────────────────────────────────
  it('renders backdrop image when available', async () => {
    renderShowDetail()
    await waitFor(() => {
      expect(document.querySelector('img[aria-hidden="true"]')).toBeInTheDocument()
    })
  })

  // ── Rating Display ──────────────────────────────────
  it('shows existing user rating when available', async () => {
    vi.mocked(showServiceModule.getRatingForShow).mockResolvedValue({
      user_id: 'user-1', show_id: 1, rating: 8, rated_at: null,
    })
    renderShowDetail()
    await waitFor(() => expect(screen.getByText(/8\/10/)).toBeInTheDocument())
  })
})
