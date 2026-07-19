import type { ShowDoc, EpisodeDoc, FollowedShowDoc, WatchedEpisodeDoc, RatingDoc, BadgeDoc, UserStatsDoc, ResumePositionDoc } from '../lib/firebase-queries'

export function buildShow(overrides: Partial<ShowDoc> = {}): ShowDoc {
  return {
    tmdb_id: 1,
    name: 'Breaking Bad',
    poster_url: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/backdrop.jpg',
    synopsis: 'A high school chemistry teacher turned meth manufacturer.',
    imdb_rating: 9.5,
    imdb_votes: 1500000,
    imdb_id: 'tt0903747',
    ...overrides,
  }
}

export function buildEpisode(overrides: Partial<EpisodeDoc> = {}): EpisodeDoc {
  return {
    tmdb_id: 101,
    show_id: 1,
    season_number: 1,
    episode_number: 1,
    title: 'Pilot',
    ...overrides,
  }
}

export function buildFollowedShow(overrides: Partial<FollowedShowDoc> = {}): FollowedShowDoc {
  return {
    user_id: 'user-1',
    show_id: 1,
    active: 1,
    diffusion: null,
    followed_at: new Date().toISOString(),
    ...overrides,
  }
}

export function buildWatchedEpisode(overrides: Partial<WatchedEpisodeDoc> = {}): WatchedEpisodeDoc {
  return {
    user_id: 'user-1',
    episode_id: 101,
    show_id: 1,
    watched_at: '2024-01-15T20:00:00Z',
    ...overrides,
  }
}

export function buildRating(overrides: Partial<RatingDoc> = {}): RatingDoc {
  return {
    user_id: 'user-1',
    show_id: 1,
    rating: 8,
    rated_at: null,
    ...overrides,
  }
}

export function buildBadge(overrides: Partial<BadgeDoc> = {}): BadgeDoc {
  return {
    user_id: 'user-1',
    badge_id: '1',
    earned_at: '2024-01-15T20:00:00Z',
    ...overrides,
  }
}

export function buildUserStats(overrides: Partial<UserStatsDoc> = {}): UserStatsDoc {
  return {
    user_id: 'user-1',
    time_spent: 3600,
    nb_episodes_watched: 150,
    ...overrides,
  }
}

export function buildResumePosition(overrides: Partial<ResumePositionDoc> = {}): ResumePositionDoc {
  return {
    user_id: 'user-1',
    content_id: 101,
    content_type: 'episode',
    show_id: 1,
    position_seconds: 120,
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function mockDocSnapshot<T>(data: T) {
  return { data: () => data, id: 'mock-id', ref: {} }
}

export function mockQuerySnapshot<T>(docs: T[]) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map(d => mockDocSnapshot(d)),
    forEach: (cb: (doc: ReturnType<typeof mockDocSnapshot<T>>) => void) => docs.forEach(d => cb(mockDocSnapshot(d))),
    metadata: {} as any,
    query: {} as any,
    docChanges: () => [],
    toJSON: () => ({}),
  } as any
}
