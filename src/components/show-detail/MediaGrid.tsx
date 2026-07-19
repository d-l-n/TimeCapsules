import { Link } from 'react-router-dom'
import { getTmdbImage } from '../../services/tmdb'
import type { TmdbSearchResult } from '../../services/tmdb'

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
  t: any
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
        <h2 className="text-base sm:text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4 flex items-center gap-2 hover:text-yellow transition-colors">
          <span>{expanded ? '▼' : '▶'}</span>
          <span>{label}</span>
          <span className="border-2 border-border px-2 py-0.5 text-xs font-bold">{items.length}</span>
        </h2>
      </button>
      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map(item => {
            const name = item.name || item.title || 'Unknown'
            const imgSrc = getTmdbImage(item.poster_path, 'w500')
            return (
              <div key={item.id} className={`border-[3px] border-border bg-surface card-neon-${['accent', 'highlight', 'cyan', 'orange', 'purple'][Math.abs(item.id) % 5]}`}>
                <Link to={`/show/-${item.id}`} className="block hover:bg-yellow transition-colors">
                  {imgSrc ? (
                    <img src={imgSrc} alt={name} className="w-full" />
                  ) : (
                    <div className="aspect-[2/3] flex items-center justify-center p-4">
                      <span className="text-xs font-bold text-center break-words">{name}</span>
                    </div>
                  )}
                  <div className="px-2 py-1 text-xs font-bold truncate border-t-2 border-border">{name}</div>
                </Link>
                <div className="px-2 pb-2 pt-1">
                  {isMovie ? (
                    <button
                      onClick={() => onWatch(item)}
                      disabled={adding === item.id || added.has(item.id)}
                      className={`w-full border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${added.get(item.id) ? 'bg-yellow text-text' : 'bg-surface text-text hover:bg-yellow'}`}
                      aria-label={`${t.showDetail.markAsWatched} — ${name}`}
                    >
                      {adding === item.id ? '...' : added.get(item.id) ? t.showDetail.watched : t.showDetail.markAsWatched}
                    </button>
                  ) : (
                    <button
                      onClick={() => onAdd(item)}
                      disabled={adding === item.id || added.has(item.id)}
                      className={`w-full border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${added.get(item.id) ? 'bg-yellow text-text' : 'bg-surface text-text hover:bg-yellow'}`}
                      aria-label={`${t.discover.addToDashboard} — ${name}`}
                    >
                      {adding === item.id ? '...' : added.get(item.id) ? t.discover.added : t.discover.addToDashboard}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
