import { Link } from 'react-router-dom'
import { useI18n } from '../lib/I18nContext'

interface ShowCardProps {
  id: number
  name: string
  posterUrl: string | null
  imdbRating?: number | null
  userRating?: number | null
  episodeCount?: number
  mediaType?: 'movie' | 'tv' | null
  wrapperClassName?: string
  actions?: React.ReactNode
  brutal?: boolean
  onRemove?: () => void
  removing?: boolean
}

export default function ShowCard({ id, name, posterUrl, imdbRating, userRating, episodeCount, mediaType, wrapperClassName = '', actions, brutal = true, onRemove, removing }: ShowCardProps) {
  const { t } = useI18n()

  // Cycle through neon colors based on id for a varied look (visible only on hover)
  const neonHoverClass = 'card-neon-' + (['accent', 'highlight', 'cyan', 'orange', 'purple'][Math.abs(id) % 5]) + '-hover'
  const rating = imdbRating != null ? String(imdbRating) : null

  return (
    <Link
      to={`/show/${id}`}
      className={`group bg-surface flex flex-col h-full transition-all hover:translate-x-0.5 ${wrapperClassName} ${brutal ? `${neonHoverClass} card-brutal` : ''}`}
      aria-label={`${name}${imdbRating != null ? ` — ${t.showDetail.imdb} ${imdbRating}` : ''}${episodeCount != null ? `, ${episodeCount} ${t.dashboard.episodes}` : ''}`}
    >
      <div className="relative">
        <div className="aspect-[2/3] bg-surface-light border-b-4 border-border overflow-hidden">
          {posterUrl ? (
            <img src={posterUrl} alt={`${name} poster`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3 text-center text-sm font-bold uppercase leading-tight break-words">{name}</div>
          )}
        </div>
        {mediaType && (
          <span className="absolute top-2 left-2 border-2 border-border bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase">{mediaType === 'movie' ? t.discover.movie : t.discover.tv}</span>
        )}
        {rating && (
          <span className={`absolute top-2 right-2 border-2 border-border bg-surface px-1.5 py-0.5 text-[9px] font-bold ${onRemove ? 'right-8' : ''}`} aria-label={`${t.showDetail.imdb} ${rating}`}>{rating}</span>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onRemove() }}
            disabled={removing}
            aria-label={t.lists.remove}
            className="x-btn absolute top-2 right-2 z-10 grid h-6 w-6 shrink-0 aspect-square place-items-center border-2 border-border bg-highlight text-[11px] font-bold leading-none text-text hover:bg-accent focus:opacity-100 max-sm:opacity-100 disabled:opacity-40 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
          >
            {removing ? '...' : '✕'}
          </button>
        )}
        {actions && (
          <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1.5 bg-gradient-to-t from-bg/90 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100 transition-opacity">
            {actions}
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-bold text-xs uppercase leading-tight break-words line-clamp-2">{name}</h3>
        <div className="flex items-center gap-2 text-xs" aria-label={`${t.dashboard.noRating}: ${imdbRating != null ? `${t.showDetail.imdb} ${imdbRating}` : t.dashboard.noRating}${episodeCount != null ? `, ${episodeCount} ${t.dashboard.episodes}` : ''}`}>
          {userRating != null && (
            <span className="border-2 border-border px-1.5 py-0.5 font-bold text-highlight">{userRating}/10</span>
          )}
          {episodeCount != null && (
            <span className="font-mono text-text-secondary" aria-label={`${episodeCount} ${t.dashboard.episodes}`}>{episodeCount}{t.dashboard.eps}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
