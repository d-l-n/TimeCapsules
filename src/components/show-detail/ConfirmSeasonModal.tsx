import { useEffect, useRef } from 'react'
import type { useI18n } from '../../lib/I18nContext'

interface ConfirmSeasonData {
  seasonNumber: number
  episodeIds: number[]
  action: 'watch' | 'unwatch'
  laterEpisodeIds?: number[]
}

interface ConfirmSeasonModalProps {
  data: ConfirmSeasonData
  onConfirm: (includeLater?: boolean) => void
  onCancel: () => void
  t: ReturnType<typeof useI18n>['t']
  isProcessing?: boolean
}

export default function ConfirmSeasonModal({ data, onConfirm, onCancel, t, isProcessing }: ConfirmSeasonModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!isProcessing && !el.open) el.showModal()
    else if (isProcessing && el.open) el.close()
  }, [isProcessing])

  const hasLater = data.action === 'unwatch' && data.laterEpisodeIds && data.laterEpisodeIds.length > 0

  return (
    <dialog ref={ref} onClose={onCancel}>
      <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-auto p-6 shadow-brutal-xl relative">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="x-btn absolute top-2 right-2 w-7 h-7 flex items-center justify-center border-2 border-border bg-surface text-text font-bold text-sm sm:hover:bg-pink transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.lists.cancel}
        >
          X
        </button>
        {hasLater ? (
          <>
            <h3 className="text-lg font-heading uppercase border-b-4 border-border pb-3 mb-4">{t.showDetail.laterUnwatchTitle}</h3>
            <p className="text-sm font-bold mb-6">
              {t.showDetail.laterUnwatchMsg
                .replace('{current}', String(data.seasonNumber))
                .replace('{currentCount}', String(data.episodeIds.length))
                .replace('{laterCount}', String(data.laterEpisodeIds!.length))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => onConfirm(true)} disabled={isProcessing} className={`flex-1 border-[3px] border-border px-4 py-3 text-sm font-bold uppercase transition-colors ${isProcessing ? 'bg-yellow/50 text-text/50 cursor-wait' : 'bg-yellow text-text sm:hover:bg-pink cursor-pointer'}`} aria-label={t.showDetail.laterUnwatchYes}>
                {isProcessing ? '...' : t.showDetail.laterUnwatchYes}
              </button>
              <button onClick={() => onConfirm(false)} disabled={isProcessing} className={`flex-1 border-[3px] border-border px-4 py-3 text-sm font-bold uppercase transition-colors ${isProcessing ? 'bg-surface/50 text-text/50 cursor-not-allowed' : 'bg-surface text-text sm:hover:bg-pink cursor-pointer'}`} aria-label={t.showDetail.laterUnwatchNo}>
                {isProcessing ? '...' : t.showDetail.laterUnwatchNo}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-heading uppercase border-b-4 border-border pb-3 mb-4">
              {data.action === 'watch' ? t.showDetail.markAllWatched : t.showDetail.markAllUnwatched}
            </h3>
            <p className="text-sm font-bold mb-6">
              {data.action === 'watch'
                ? t.showDetail.confirmMarkWatched.replace('{count}', String(data.episodeIds.length))
                : t.showDetail.confirmMarkUnwatched.replace('{count}', String(data.episodeIds.length))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => onConfirm()} disabled={isProcessing} className={`flex-1 border-[3px] border-border px-4 py-3 text-sm font-bold uppercase transition-colors ${isProcessing ? 'bg-yellow/50 text-text/50 cursor-wait' : 'bg-yellow text-text sm:hover:bg-pink cursor-pointer'}`}
                aria-label={data.action === 'watch' ? t.showDetail.catchUpYes : t.showDetail.confirmUnwatchYes}>
                {isProcessing ? '...' : (data.action === 'watch' ? t.showDetail.catchUpYes : t.showDetail.confirmUnwatchYes)}
              </button>
              <button onClick={onCancel} disabled={isProcessing} className={`flex-1 border-[3px] border-border px-4 py-3 text-sm font-bold uppercase transition-colors ${isProcessing ? 'bg-surface/50 text-text/50 cursor-not-allowed' : 'bg-surface text-text sm:hover:bg-pink cursor-pointer'}`}
                aria-label={t.lists.cancel}>
                {t.lists.cancel}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
