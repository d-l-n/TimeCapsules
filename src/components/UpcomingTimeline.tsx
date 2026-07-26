import { Link } from 'react-router-dom'
import { useI18n } from '../lib/I18nContext'
import { ArrowRightIcon } from '.'
import type { NextEpisodeToAir } from '../services/tmdb'

interface UpcomingShow {
  show_id: number
  name: string
  poster_url: string | null
  next_episode: NextEpisodeToAir | null
  daysUntil: number | null
}

interface UpcomingTimelineProps {
  items: UpcomingShow[]
}

export default function UpcomingTimeline({ items }: UpcomingTimelineProps) {
  const { t } = useI18n()

  if (items.length === 0) return null

  const grouped = items.reduce<Record<number, UpcomingShow[]>>((acc, item) => {
    const key = item.daysUntil ?? 999
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  const getDayLabel = (days: number) => {
    if (days === 0) return t.upcoming.today
    if (days === 1) return t.upcoming.tomorrow
    return `${days} ${t.upcoming.days}`
  }

  const getDayColor = (days: number) => {
    if (days === 0) return 'bg-red text-text'
    if (days === 1) return 'bg-yellow text-text'
    return 'bg-surface text-text'
  }

  return (
    <section aria-labelledby="upcoming-heading">
      <div className="flex items-center justify-between border-b-[3px] border-border pb-3 mb-4">
        <h2 id="upcoming-heading" className="text-xl sm:text-2xl font-black uppercase font-heading">
          {t.upcoming.title}
        </h2>
        <Link to="/upcoming" className="text-[10px] sm:text-xs font-bold uppercase text-text-secondary sm:hover:text-text transition-colors">
          {t.dashboard.viewAll} <ArrowRightIcon className="w-3 h-3 inline" />
        </Link>
      </div>

      <div className="space-y-4">
        {sortedDays.map(days => (
          <div key={days} className="flex gap-3 sm:gap-4">
            <div className="shrink-0 w-16 sm:w-20 pt-1">
              <div className={`inline-block px-2 py-1 text-[10px] sm:text-xs font-bold border-2 border-border ${getDayColor(days)}`}>
                {getDayLabel(days)}
              </div>
            </div>
            <div className="flex-1 border-l-[3px] border-border pl-3 sm:pl-4 space-y-2">
              {grouped[days].map(item => (
                <Link
                  key={item.show_id}
                  to={`/show/${item.show_id}`}
                  className="group flex items-center gap-3 bg-surface border-[3px] border-border p-2 sm:p-3 sm:hover:-translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-brutal-md transition-all"
                >
                  <div className="w-10 h-14 sm:w-12 sm:h-16 shrink-0 bg-surface-light border-2 border-border overflow-hidden">
                    {item.poster_url ? (
                      <img src={item.poster_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-bold uppercase">{item.name[0]}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold uppercase truncate">{item.name}</div>
                    {item.next_episode && (
                      <div className="text-[10px] sm:text-xs text-text-secondary mt-0.5">
                        S{item.next_episode.season_number} · E{item.next_episode.episode_number}
                        {item.next_episode.name && (
                          <span className="hidden sm:inline"> — {item.next_episode.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs font-bold text-text-secondary sm:group-hover:text-orange transition-colors">
                    <ArrowRightIcon className="w-3 h-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
