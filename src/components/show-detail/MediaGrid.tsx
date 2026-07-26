import { Link } from 'react-router-dom'
import { getTmdbImage } from '../../services/tmdb'
import type { TmdbSearchResult } from '../../services/tmdb'
import type { useI18n } from '../../lib/I18nContext'

interface MediaGridProps {
  items: TmdbSearchResult[]
  isMovie: boolean
  label: string
  expanded: boolean
  onToggle: () => void
  onAdd: (item: TmdbSearchResult) => void
  onWatch: (item: TmdbSearchResult) => void
  adding: number | null
  added: Map<number, boolean>
  t: ReturnType<typeof useI18n>['t']
}

export default function MediaGrid({ items, isMovie, label, expanded, onToggle, onAdd, onWatch, adding, added, t }: MediaGridProps) {
  if (items.length === 0) return null

  return (
    <section aria-label={label}>
      <button
        onClick={onToggle}
        className="w-full text-left cursor-pointer"
        aria-expanded={expanded}
        aria-label={label}
      >
        <h2 className="text-base sm:text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4 flex items-center gap-2 sm:hover:text-yellow transition-colors">
          <span>{expanded ? '▼' : '▶'}</span>
          <span>{label}</span>
          <span className="border-2 border-border px-2 py-0.5 text-xs font-bold">{items.length}</span>
        </h2>
      </button>
      {expanded && (
        <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-5 sm:items-stretch">
          {items.map(item => {
            const name = item.name || item.title || 'Unknown'
            const imgSrc = getTmdbImage(item.poster_path, 'w500')
            const year = (item.first_air_date || item.release_date || '').slice(0, 4)
            const rating = item.vote_average != null && item.vote_average > 0 ? item.vote_average.toFixed(1) : null
            const isAdded = added.get(item.id) ?? false
            const detailPath = `/show/-${item.id}`

            return (
              <div
                key={item.id}
                className="group bg-surface border-[3px] border-border card-lift flex flex-col h-full shadow-brutal"
              >
                <Link to={detailPath} className="block relative" aria-label={name}>
                  <div className="aspect-[2/3] bg-surface-light border-b-[3px] border-border overflow-hidden">
                    {imgSrc ? (
                      <img src={imgSrc} alt={`${name} poster`} className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-3 text-center text-sm font-bold uppercase leading-tight">{name}</div>
                    )}
                  </div>
                  <span className="absolute top-2 left-2 border-2 border-border bg-yellow px-1.5 py-0.5 text-[9px] font-bold uppercase">{isMovie ? t.discover.movie : t.discover.tv}</span>
                  {rating && (
                    <span className="absolute top-2 right-2 border-2 border-border bg-surface px-1.5 py-0.5 text-[9px] font-bold" aria-label={`${t.showDetail.imdb} ${rating}`}>{rating}</span>
                  )}
                </Link>

                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs uppercase leading-tight line-clamp-2">{name}</h3>
                    {year && <div className="text-[10px] font-mono text-text-secondary mt-0.5">{year}</div>}
                  </div>

                  <div className="mt-auto">
                    {isAdded ? (
                      <div className="w-full border-2 border-border bg-surface py-1.5 text-[10px] font-bold uppercase text-center text-text-secondary">
                        {isMovie ? t.showDetail.watched : t.watchlist.added}
                      </div>
                    ) : isMovie ? (
                      <button
                        onClick={() => onWatch(item)}
                        disabled={adding === item.id}
                        className="w-full border-2 border-border bg-surface text-text py-1.5 text-[10px] font-bold uppercase sm:hover:bg-yellow transition-colors disabled:opacity-40 cursor-pointer"
                        aria-label={`${t.showDetail.markAsWatched} — ${name}`}
                      >
                        {adding === item.id ? '...' : t.showDetail.markAsWatched}
                      </button>
                    ) : (
                      <button
                        onClick={() => onAdd(item)}
                        disabled={adding === item.id}
                        className="w-full border-2 border-border bg-yellow text-text py-1.5 text-[10px] font-bold uppercase sm:hover:bg-orange transition-colors disabled:opacity-40 cursor-pointer"
                        aria-label={`${t.discover.addToDashboard} — ${name}`}
                      >
                        {adding === item.id ? '...' : t.discover.addToDashboard}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
