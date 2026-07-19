export interface ShowDoc {
  tmdb_id: number
  name: string
  poster_url: string | null
  backdrop_url: string | null
  synopsis: string | null
  imdb_rating: number | null
  imdb_votes: number | null
  imdb_id: string | null
  media_type?: 'movie' | 'tv'
  episode_run_time?: number[]
}

export interface EpisodeDoc {
  tmdb_id: number
  show_id: number
  season_number: number
  episode_number: number
  title: string | null
}

export interface WatchedEpisodeDoc {
  user_id: string
  episode_id: number
  show_id?: number
  watched_at: string
}

export interface FollowedShowDoc {
  user_id: string
  show_id: number
  active: number
  diffusion: string | null
  followed_at: string | null
}

export interface NotificationDoc {
  id: string
  user_id: string
  type: 'upcoming_episode' | 'show_returning'
  title: string
  body: string
  show_id?: number
  read: boolean
  created_at: string
}

export interface CustomListDoc {
  id: string
  user_id: string
  name: string
  description: string
  show_ids: number[]
  createdAt: string
  is_default?: boolean
  seeded?: boolean
}

export const DEFAULT_LIST_IDS = ['default-upcoming', 'default-pending', 'default-uptodate', 'default-finished'] as const
export type DefaultListId = typeof DEFAULT_LIST_IDS[number]

export function isDefaultList(id: string | undefined): boolean {
  return !!id && (DEFAULT_LIST_IDS as readonly string[]).includes(id)
}

export interface RatingDoc {
  user_id: string
  show_id: number
  rating: number
  rated_at: string | null
}

export interface BadgeDoc {
  user_id: string
  badge_id: string
  earned_at: string | null
}

export interface ResumePositionDoc {
  user_id: string
  content_id: number
  content_type: 'episode' | 'movie'
  show_id: number
  position_seconds: number
  updated_at: string
}

export interface EpisodeEmotionDoc {
  user_id: string
  episode_id: number
  emotion_id: string
  created_at: string
}

export interface WatchlistItemDoc {
  user_id: string
  show_id: number
  added_at: string
}

export interface GroupDoc {
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface GroupMemberDoc {
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface GroupShowDoc {
  group_id: string
  show_id: number
  added_by: string
  added_at: string
}

export interface GroupWatchEventDoc {
  group_id: string
  episode_id: number
  show_id: number
  marked_by: string
  created_at: string
}

export interface UserStatsDoc {
  user_id: string
  time_spent: number
  nb_episodes_watched: number
}
