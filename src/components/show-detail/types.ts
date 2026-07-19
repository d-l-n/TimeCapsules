export interface MergedEpisode {
  id: number
  season_number: number
  episode_number: number
  title: string
  fromTmdb: boolean
  overview: string | null
  still_path: string | null
  air_date: string | null
}

export const MEMBER_COLORS = ['#ccff00', '#ff2d78', '#00d4ff', '#ff8800', '#a855f7', '#22c55e']

export const PRESET_TIMES = [
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '45m', seconds: 2700 },
  { label: '1h', seconds: 3600 },
  { label: '1h30', seconds: 5400 },
  { label: '2h', seconds: 7200 },
]

export function fmtPos(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
