import { describe, it, expect } from 'vitest'
import type { ShowDoc, EpisodeDoc, FollowedShowDoc, WatchedEpisodeDoc, RatingDoc, BadgeDoc, UserStatsDoc } from './firebase-queries'

describe('Firestore document types', () => {
  it('ShowDoc has required fields', () => {
    const doc: ShowDoc = {
      tmdb_id: 1,
      name: 'Test Show',
      poster_url: null,
      backdrop_url: null,
      synopsis: null,
      imdb_rating: null,
      imdb_votes: null,
      imdb_id: null,
    }
    expect(doc.tmdb_id).toBe(1)
    expect(doc.name).toBe('Test Show')
  })

  it('EpisodeDoc has required fields', () => {
    const doc: EpisodeDoc = {
      tmdb_id: 101,
      show_id: 1,
      season_number: 1,
      episode_number: 1,
      title: 'Pilot',
    }
    expect(doc.tmdb_id).toBe(101)
    expect(doc.title).toBe('Pilot')
  })

  it('WatchedEpisodeDoc has required fields', () => {
    const doc: WatchedEpisodeDoc = {
      user_id: 'user-1',
      episode_id: 101,
      show_id: 1,
      watched_at: '2024-01-15T20:00:00Z',
    }
    expect(doc.user_id).toBe('user-1')
    expect(doc.watched_at).toBeTruthy()
  })

  it('FollowedShowDoc has required fields', () => {
    const doc: FollowedShowDoc = {
      user_id: 'user-1',
      show_id: 1,
      active: 1,
      diffusion: null,
      followed_at: '2024-01-15T20:00:00Z',
    }
    expect(doc.active).toBe(1)
  })

  it('RatingDoc has required fields', () => {
    const doc: RatingDoc = {
      user_id: 'user-1',
      show_id: 1,
      rating: 8,
      rated_at: null,
    }
    expect(doc.rating).toBe(8)
  })

  it('BadgeDoc has required fields', () => {
    const doc: BadgeDoc = {
      user_id: 'user-1',
      badge_id: '1',
      earned_at: '2024-01-15T20:00:00Z',
    }
    expect(doc.badge_id).toBe('1')
  })

  it('UserStatsDoc has required fields', () => {
    const doc: UserStatsDoc = {
      user_id: 'user-1',
      time_spent: 3600,
      nb_episodes_watched: 100,
    }
    expect(doc.nb_episodes_watched).toBe(100)
  })

})
