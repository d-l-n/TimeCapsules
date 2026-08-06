import SeriesReactions from './SeriesReactions'
import type { useI18n } from '../../lib/I18nContext'
import type { GroupWatchEventDoc } from '../../lib/firebase-queries'

interface MergedEpisode {
  id: number
  season_number: number
  episode_number: number
  title: string
}

interface BatchProgress {
  current: number
  total: number
  context: 'catchUp' | 'season'
}

interface ShowToastsProps {
  batchProgress: BatchProgress | null
  watchlistToast: { added: boolean } | null
  episodeToast: { episodeNumber: number; seasonNumber: number; watched: boolean } | null
  movieToast: { watched: boolean; name: string } | null
  seasonToast: { seasonNumber: number; action: 'watch' | 'unwatch'; count: number } | null
  groupWatchToast: GroupWatchEventDoc | null
  seriesToast: number | null
  feedbackEp: { id: number; watched: boolean; x: number; y: number } | null
  showName: string | null
  uid: string
  mergedEpisodes: MergedEpisode[]
  currentEmotion: string | null
  onEmotionSelect: (emotionId: string | null) => void
  onSeriesToastClose: () => void
  t: ReturnType<typeof useI18n>['t']
}

export default function ShowToasts({
  batchProgress,
  watchlistToast,
  episodeToast,
  movieToast,
  seasonToast,
  groupWatchToast,
  seriesToast,
  feedbackEp,
  showName,
  uid,
  mergedEpisodes,
  currentEmotion,
  onEmotionSelect,
  onSeriesToastClose,
  t,
}: ShowToastsProps) {
  return (
    <div aria-live="polite" aria-atomic="false">
      {batchProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="progressbar" aria-valuenow={batchProgress.current} aria-valuemin={0} aria-valuemax={batchProgress.total} aria-label={t.showDetail.savingEpisodes.replace('{current}', String(batchProgress.current)).replace('{total}', String(batchProgress.total))}>
          <div className="bg-surface border-[3px] border-border p-6 shadow-brutal-xl max-w-xs w-full mx-4">
            <div className="text-xs font-bold uppercase text-text-secondary mb-3 text-center">{batchProgress.context === 'season' ? t.profile.saving : t.showDetail.catchUpTitle}</div>
            <div className="text-lg font-black text-center mb-3">
              <span className="text-yellow">{batchProgress.current}</span>
              <span className="text-text-secondary"> / </span>
              <span>{batchProgress.total}</span>
            </div>
            <div className="h-3 bg-surface-light border-2 border-border overflow-hidden">
              <div
                className="h-full bg-yellow progress-shimmer transition-all duration-300 ease-out"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {watchlistToast && (
        <div className="fixed bottom-0 right-4 z-50 animate-slide-up mb-2">
          <div className={`bg-surface border-[3px] px-4 py-3 shadow-brutal-xl max-w-xs ${watchlistToast.added ? 'border-yellow' : 'border-pink'}`}>
            <div className="text-[10px] font-bold text-text-secondary uppercase">{t.watchlist.title}</div>
            <div className="text-xs font-bold mt-1">
              <span className={watchlistToast.added ? 'text-yellow' : 'text-pink'}>
                {watchlistToast.added ? t.watchlist.added : t.watchlist.removed}
              </span>
            </div>
          </div>
        </div>
      )}
      {episodeToast && (
        <div className="fixed bottom-12 right-4 z-50 animate-slide-up">
          <div className={`bg-surface border-[3px] px-4 py-3 shadow-brutal-xl max-w-xs ${episodeToast.watched ? 'border-yellow' : 'border-pink'}`}>
            <div className="text-[10px] font-bold text-text-secondary uppercase">{t.showDetail.season} {episodeToast.seasonNumber} · {t.showDetail.episode} {episodeToast.episodeNumber}</div>
            <div className="text-xs font-bold mt-1">
              <span className={episodeToast.watched ? 'text-yellow' : 'text-pink'}>
                {episodeToast.watched ? t.showDetail.watched : t.showDetail.unwatched}
              </span>
            </div>
          </div>
        </div>
      )}
      {movieToast && (
        <div className="fixed bottom-24 right-4 z-50 animate-slide-up">
          <div className={`bg-surface border-[3px] px-4 py-3 shadow-brutal-xl max-w-xs ${movieToast.watched ? 'border-yellow' : 'border-pink'}`}>
            <div className="text-[10px] font-bold text-text-secondary uppercase truncate max-w-[200px]">{movieToast.name}</div>
            <div className="text-xs font-bold mt-1">
              <span className={movieToast.watched ? 'text-yellow' : 'text-pink'}>
                {movieToast.watched ? t.showDetail.watched : t.showDetail.unwatched}
              </span>
            </div>
          </div>
        </div>
      )}
      {seriesToast !== null && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-surface border-[3px] border-yellow px-6 py-5 shadow-brutal-xl max-w-sm text-center">
            <div className="text-lg sm:text-xl font-black text-yellow">{t.showDetail.seriesComplete}</div>
            <div className="text-[10px] font-bold text-text-secondary uppercase mt-2">{showName}</div>
            <SeriesReactions episodeId={seriesToast} uid={uid} currentEmotion={currentEmotion} onSelect={onEmotionSelect} onClose={onSeriesToastClose} t={t} />
          </div>
        </div>
      )}
      {seasonToast && (
        <div className="fixed bottom-36 right-4 z-50 animate-slide-up">
          <div className="bg-surface border-[3px] border-yellow px-4 py-3 shadow-brutal-xl max-w-xs">
            <div className="text-[10px] font-bold text-text-secondary uppercase">{seasonToast.action === 'watch' ? t.showDetail.markedWatched : t.showDetail.markedUnwatched}</div>
            <div className="text-xs font-bold mt-1">
              {seasonToast.seasonNumber > 0 && <span className="text-pink">{t.showDetail.season} {seasonToast.seasonNumber}</span>}
              {seasonToast.seasonNumber > 0 && <span> — </span>}
              <span>{seasonToast.count} {seasonToast.count !== 1 ? `${t.showDetail.episode}s` : t.showDetail.episode}</span>
            </div>
          </div>
        </div>
      )}
      {groupWatchToast && (
        <div className="fixed bottom-48 right-4 z-50 animate-slide-up">
          <div className="bg-surface border-[3px] border-yellow px-4 py-3 shadow-brutal-xl max-w-xs">
            <div className="text-[10px] font-bold text-text-secondary uppercase">{t.watchParty.watchingTogether}</div>
            <div className="text-xs font-bold mt-1">
              <span className="text-pink">{t.watchParty.aMember}</span>
              {' '}{t.watchParty.watchedEpisode.replace('{episode}', (() => {
                const ep = mergedEpisodes.find(e => e.id === groupWatchToast.episode_id)
                return ep ? `${t.showDetail.episode} ${ep.episode_number} — ${ep.title}` : `#${groupWatchToast.episode_id}`
              })())}
            </div>
          </div>
        </div>
      )}
      {feedbackEp && (
        <div
          className="fixed pointer-events-none z-50 animate-float-up"
          style={{ left: feedbackEp.x, top: feedbackEp.y, transform: 'translate(-50%, -50%)' }}
          aria-hidden="true"
        >
          <span className={`text-3xl font-bold ${feedbackEp.watched ? 'text-yellow' : 'text-pink'}`}>
            {feedbackEp.watched ? t.common.ok : 'X'}
          </span>
        </div>
      )}
    </div>
  )
}
