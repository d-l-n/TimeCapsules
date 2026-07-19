import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mock all context hooks ──────────────────────────────
vi.mock('../lib/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../lib/I18nContext', () => ({
  useI18n: vi.fn(),
}))

vi.mock('../hooks', () => ({
  useFollowedShows: vi.fn(),
  useStats: vi.fn(),
  useWatchlist: vi.fn(),
}))

// ── Mock services used inside Dashboard (not via hooks) ──
vi.mock('../services/showService', () => ({
  getFinishedContent: vi.fn(),
  toggleWatchedEpisode: vi.fn(),
}))

vi.mock('../services/watchlistService', () => ({
  getWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
}))

vi.mock('../services/tmdb', () => ({
  getTvNextEpisode: vi.fn(),
  tmdbLang: vi.fn(() => 'en-US'),
}))

vi.mock('../lib/firestore-utils', () => ({
  buildShowsMap: vi.fn(),
}))

vi.mock('../lib/memento', () => ({
  memento: vi.fn(() => vi.fn()),
  mementoClear: vi.fn(),
}))

// ── Dynamic imports (post-mock) ────────────────────────
const authModule = await import('../lib/AuthContext')
const i18nModule = await import('../lib/I18nContext')
const hooksModule = await import('../hooks')
const showServiceModule = await import('../services/showService')
const wlServiceModule = await import('../services/watchlistService')
const tmdbModule = await import('../services/tmdb')
const firestoreUtilsModule = await import('../lib/firestore-utils')
const { default: Dashboard } = await import('./Dashboard')

// ── Translations fixture ───────────────────────────────
const enT = {
  app: { name: 'TIME CAPSULES' },
  nav: { dashboard: 'Dashboard', discover: 'Discover' },
  dashboard: {
    loading: 'LOADING...',
    continueWatching: 'Continue Watching',
    noShows: 'NO SHOWS FOUND',
    episodes: 'episodes',
    dayStreak: 'day streak',
    progress: 'Progress',
    continueBtn: 'CONTINUE',
    totalWatched: 'Episodes Watched',
    showsTracked: 'Shows Tracked',
    timeSpent: 'Time Watched',
    viewAll: 'VIEW ALL',
    watchlistEmpty: 'No shows in your watchlist yet.',
    watchlistEmptyDesc: 'Start tracking shows to see them here.',
    upToDateEmpty: 'No shows up to date.',
    upToDateEmptyDesc: 'Follow more shows to keep your queue full.',
    finishedEmpty: 'No finished shows yet.',
    finishedEmptyDesc: 'Tracked shows you complete will appear here.',
    welcome: 'Welcome to Time Capsules!',
    welcomeDesc: 'Start by discovering and tracking your favorite TV shows and movies.',
    goDiscover: 'DISCOVER SHOWS',
    upToDate: 'Up to Date',
    upToDateDesc: 'All caught up! Waiting for new episodes.',
    finished: 'Finished',
  },
  watchlist: { title: 'Watchlist', add: 'ADD TO WATCHLIST', added: 'IN WATCHLIST' },
  upcoming: { title: 'Upcoming Releases', days: 'days', today: 'TODAY', tomorrow: 'TOMORROW' },
  settings: { light: 'Light', dark: 'Dark' },
  stats: { minutes: 'm', hours: 'h' },
  showDetail: { imdb: 'IMDb' },
  install: { update: 'UPDATE AVAILABLE' },
  offline: { title: 'OFFLINE', desc: 'Data may not sync' },
  profile: { title: 'Profile' },
}

const mockUser = { uid: 'user-1', email: 'test@test.com' } as any

const mockBingingItem = {
  id: 1,
  name: 'Breaking Bad',
  poster_url: '/poster.jpg',
  imdb_rating: 9.5,
  progress: 33,
  episodesWatched: 3,
  totalEpisodes: 9,
}

const mockWatchlistItem = {
  show_id: 3,
  name: 'The Office',
  poster_url: '/poster3.jpg',
  imdb_rating: 8.9,
  media_type: 'tv' as const,
  added_at: new Date().toISOString(),
}

const mockFinishedItem = {
  id: 4,
  name: 'Stranger Things',
  poster_url: '/poster4.jpg',
  imdb_rating: 8.7,
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

// Helper: set up a minimal data state so dashboard shows its sections (not the welcome empty state)
function withMinimalData() {
  vi.mocked(hooksModule.useFollowedShows).mockReturnValue({
    shows: [], binging: [mockBingingItem], loading: false, refresh: vi.fn(),
  })
  vi.mocked(hooksModule.useWatchlist).mockReturnValue({
    items: [mockWatchlistItem], loading: false, refresh: vi.fn(),
  })
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated, english, loading=false, empty data
    vi.mocked(authModule.useAuth).mockReturnValue({ user: mockUser, loading: false } as any)
    vi.mocked(i18nModule.useI18n).mockReturnValue({ t: enT, lang: 'en', setLang: vi.fn() } as any)
    vi.mocked(hooksModule.useFollowedShows).mockReturnValue({
      shows: [], binging: [], loading: false, refresh: vi.fn(),
    })
    vi.mocked(hooksModule.useStats).mockReturnValue({
      stats: { time_spent: 0, nb_episodes_watched: 0 },
      ratingDist: [], showCount: 0, badges: [], streak: 0,
      loading: false, refresh: vi.fn(), BADGE_NAMES: {},
    } as any)
    vi.mocked(hooksModule.useWatchlist).mockReturnValue({
      items: [], loading: false, refresh: vi.fn(),
    })

    vi.mocked(showServiceModule.getFinishedContent).mockResolvedValue([])
    vi.mocked(showServiceModule.toggleWatchedEpisode).mockResolvedValue(undefined)
    vi.mocked(wlServiceModule.getWatchlist).mockResolvedValue([])
    vi.mocked(wlServiceModule.removeFromWatchlist).mockResolvedValue(undefined)
    vi.mocked(tmdbModule.getTvNextEpisode).mockResolvedValue(null)
    vi.mocked(firestoreUtilsModule.buildShowsMap).mockResolvedValue(new Map())
  })

  // ── Loading State ───────────────────────────────────
  it('shows loading spinner when followed shows are loading and no cached data', () => {
    vi.mocked(hooksModule.useFollowedShows).mockReturnValue({
      shows: [], binging: [], loading: true, refresh: vi.fn(),
    })
    renderDashboard()
    expect(screen.getByText('LOADING...')).toBeInTheDocument()
  })

  // ── Empty State (top-level) ──────────────────────────
  it('shows welcome empty state when user has no shows at all', () => {
    renderDashboard()
    expect(screen.getByText('Welcome to Time Capsules!')).toBeInTheDocument()
  })

  it('renders a link to discover page in empty state', () => {
    renderDashboard()
    const discoverLink = screen.getByText('DISCOVER SHOWS').closest('a')
    expect(discoverLink).toHaveAttribute('href', '/discover')
  })

  // ── Stats Bar (requires data to avoid top-level empty) ─
  it('shows streak stat when streak > 1', () => {
    withMinimalData()
    vi.mocked(hooksModule.useStats).mockReturnValue({
      stats: { time_spent: 3600, nb_episodes_watched: 50 },
      ratingDist: [], showCount: 0, badges: [], streak: 5,
      loading: false, refresh: vi.fn(), BADGE_NAMES: {},
    } as any)
    renderDashboard()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('day streak')).toBeInTheDocument()
  })

  it('does not show streak stat when streak is 0', () => {
    withMinimalData()
    renderDashboard()
    expect(screen.queryByText('day streak')).not.toBeInTheDocument()
  })

  it('shows episode count in stats bar', () => {
    withMinimalData()
    vi.mocked(hooksModule.useStats).mockReturnValue({
      stats: { time_spent: 7200, nb_episodes_watched: 150 },
      ratingDist: [], showCount: 0, badges: [], streak: 3,
      loading: false, refresh: vi.fn(), BADGE_NAMES: {},
    } as any)
    renderDashboard()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('Episodes Watched')).toBeInTheDocument()
  })

  // ── Continue Watching / Binging Section ──────────────
  it('shows continue watching section when user has binging shows', () => {
    withMinimalData()
    renderDashboard()
    expect(screen.getByText('Continue Watching')).toBeInTheDocument()
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument()
  })

  it('shows progress percentage and episode count in binging items', () => {
    withMinimalData()
    renderDashboard()
    expect(screen.getByText('33%')).toBeInTheDocument()
    expect(screen.getByText(/3\/9/)).toBeInTheDocument()
  })

  it('hides continue watching section when no binging shows', () => {
    withMinimalData()
    // override binging to empty
    vi.mocked(hooksModule.useFollowedShows).mockReturnValue({
      shows: [], binging: [], loading: false, refresh: vi.fn(),
    })
    renderDashboard()
    expect(screen.queryByText('Continue Watching')).not.toBeInTheDocument()
  })

  // ── Watchlist Section ────────────────────────────────
  it('shows watchlist section with items', () => {
    withMinimalData()
    renderDashboard()
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
    expect(screen.getByText('The Office')).toBeInTheDocument()
  })

  it('shows watchlist empty state when no items in watchlist but other data exists', () => {
    withMinimalData()
    // Override watchlist to empty
    vi.mocked(hooksModule.useWatchlist).mockReturnValue({
      items: [], loading: false, refresh: vi.fn(),
    })
    renderDashboard()
    expect(screen.getByText('No shows in your watchlist yet.')).toBeInTheDocument()
  })

  it('shows view all link in watchlist section', () => {
    withMinimalData()
    renderDashboard()
    const viewAllLink = screen.getByRole('link', { name: /VIEW ALL/ })
    expect(viewAllLink).toHaveAttribute('href', '/profile?section=lists')
  })

  // ── Finished Section ─────────────────────────────────
  it('shows finished section when there are finished shows', async () => {
    withMinimalData()
    vi.mocked(showServiceModule.getFinishedContent).mockResolvedValue([mockFinishedItem])
    renderDashboard()
    await waitFor(() => expect(screen.getByText('Finished')).toBeInTheDocument())
  })

  it('shows finished inline empty state when no finished shows but other data exists', async () => {
    withMinimalData()
    renderDashboard()
    // The inline empty state is shown inside the Dashboard layout
    await waitFor(() => expect(screen.getByText('No finished shows yet.')).toBeInTheDocument())
  })

  // ── Edge Cases ───────────────────────────────────────
  it('handles undefined user gracefully without crashing', () => {
    vi.mocked(authModule.useAuth).mockReturnValue({ user: null, loading: false } as any)
    const { container } = renderDashboard()
    expect(container).toBeTruthy()
  })

  it('shows discover button for a logged-in user with no data', () => {
    renderDashboard()
    expect(screen.getByText('Welcome to Time Capsules!')).toBeInTheDocument()
    expect(screen.getByText('DISCOVER SHOWS')).toBeInTheDocument()
  })
})
