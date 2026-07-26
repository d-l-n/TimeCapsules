import { Link } from 'react-router-dom'
import { getTmdbImage } from '../../services/tmdb'
import type { TmdbCollectionInfo, TmdbCollectionPart } from '../../services/tmdb'
import type { useI18n } from '../../lib/I18nContext'

interface CollectionGridProps {
  collection: TmdbCollectionInfo
  parts: TmdbCollectionPart[]
  excludeId: number | undefined
  t: ReturnType<typeof useI18n>['t']
}

export default function CollectionGrid({ collection, parts, excludeId, t }: CollectionGridProps) {
  return (
    <section aria-label={t.showDetail.collection}>
      <h2 className="text-base sm:text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4">{t.showDetail.collection}: {collection.name}</h2>
      <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 sm:gap-3">
        {parts
          .filter(p => p.id !== excludeId)
          .map(p => (
            <Link
              key={p.id}
              to={`/show/-${p.id}`}
              className={`border-[3px] border-border bg-surface sm:hover:bg-yellow transition-colors block card-neon-${['accent', 'highlight', 'cyan', 'orange', 'purple'][Math.abs(p.id) % 5]}`}
            >
              {p.poster_path ? (
                <img src={getTmdbImage(p.poster_path, 'w500')!} alt={p.title || p.name || ''} className="w-full" />
              ) : (
                <div className="aspect-[2/3] flex items-center justify-center p-4">
                  <span className="text-xs font-bold text-center break-words">{p.title || p.name || 'Unknown'}</span>
                </div>
              )}
              <div className="px-2 py-1 text-xs font-bold truncate border-t-2 border-border">{p.title || p.name}</div>
            </Link>
          ))}
      </div>
    </section>
  )
}
