import { Link } from 'react-router-dom'
import { useI18n } from '../lib/I18nContext'
import type { BingingItem } from '../hooks/useFollowedShows'

interface ContinueWatchingProps {
  items: BingingItem[]
}

export default function ContinueWatching({ items }: ContinueWatchingProps) {
  const { t } = useI18n()

  if (items.length === 0) return null

  return (
    <section aria-labelledby="continue-heading">
      <div className="flex items-center gap-3 border-b-[3px] border-border pb-3 mb-4">
        <h2 id="continue-heading" className="text-xl sm:text-2xl font-black uppercase font-heading">
          {t.dashboard.continueWatching}
        </h2>
        <div className="h-2.5 w-2.5 bg-red animate-pulse" />
      </div>

      <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[80vw] max-sm:overflow-x-auto max-sm:gap-4 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {items.map(item => {
          const episodesWatched = item.episodesWatched ?? 0
          const totalEpisodes = item.totalEpisodes ?? 1
          const progress = item.progress ?? 0

          return (
            <Link
              key={item.id}
              to={`/show/${item.id}`}
              className="group block bg-surface border-[3px] border-border shadow-brutal overflow-hidden sm:hover:-translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-brutal-lg transition-all"
              aria-label={`${item.name} — ${progress}%`}
            >
              <div className="flex">
                <div className="w-24 sm:w-28 shrink-0 aspect-[2/3] bg-surface-light border-r-[3px] border-border overflow-hidden">
                  {item.poster_url ? (
                    <img src={item.poster_url} alt="" className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs font-bold uppercase leading-tight">{item.name}</div>
                  )}
                </div>
                <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-sm font-bold uppercase truncate mb-1">{item.name}</h3>
                    <div className="text-xs text-text-secondary">
                      {episodesWatched}/{totalEpisodes} {t.dashboard.episodes}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative h-3 bg-surface-light border-2 border-border overflow-hidden">
                      <div
                        className="h-full bg-yellow progress-shimmer transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-text">{progress}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-text-secondary">{t.dashboard.progress}</span>
                      <span className="text-[10px] font-bold uppercase bg-blue text-text border-2 border-border px-2 py-0.5">
                        {t.dashboard.continueBtn}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
