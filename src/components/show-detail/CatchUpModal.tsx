import { useEffect, useRef } from 'react'
import type { useI18n } from '../../lib/I18nContext'

interface CatchUpModalProps {
  data: { episodeId: number; prevIds: number[]; hasPrevSeasons: boolean; seasonEpisodeIds?: number[] }
  onCatchUp: (markAll: boolean) => void
  onClose: () => void
  t: ReturnType<typeof useI18n>['t']
  isProcessing?: boolean
}

export default function CatchUpModal({ data, onCatchUp, onClose, t, isProcessing }: CatchUpModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const n = data.prevIds.length
  const message = data.hasPrevSeasons
    ? (n === 1 ? t.showDetail.catchUpPrevSeason : t.showDetail.catchUpPrevSeasonPlural).replace('{count}', String(n))
    : (n === 1 ? t.showDetail.catchUpSameSeason : t.showDetail.catchUpSameSeasonPlural).replace('{count}', String(n))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!isProcessing && !el.open) el.showModal()
    else if (isProcessing && el.open) el.close()
  }, [isProcessing])

  return (
    <dialog ref={ref} onClose={onClose}>
      <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-auto p-6 shadow-brutal-xl relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="x-btn absolute top-2 right-2 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center border-2 border-border bg-surface text-text font-bold text-sm transition-colors cursor-pointer active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed sm:hover:bg-pink"
          aria-label={t.lists.cancel}
        >
          X
        </button>
        <h3 className="text-lg font-heading uppercase border-b-4 border-border pb-3 mb-4">{t.showDetail.catchUpTitle}</h3>
        <p className="text-xs sm:text-sm font-bold mb-4 sm:mb-6">{message}</p>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => onCatchUp(true)}
            disabled={isProcessing}
            className={`flex-1 border-[3px] border-border px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase transition-all ${isProcessing ? 'bg-yellow/50 text-text/50 cursor-wait' : 'bg-yellow text-text active:translate-x-px active:translate-y-px active:shadow-none sm:hover:bg-pink cursor-pointer'}`}
            aria-label={t.showDetail.catchUpYes}
          >
            {isProcessing ? '...' : t.showDetail.catchUpYes}
          </button>
          <button
            onClick={() => onCatchUp(false)}
            disabled={isProcessing}
            className={`flex-1 border-[3px] border-border px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase transition-all ${isProcessing ? 'bg-surface/50 text-text/50 cursor-not-allowed' : 'bg-surface text-text active:translate-x-px active:translate-y-px active:shadow-none sm:hover:bg-yellow cursor-pointer'}`}
            aria-label={t.showDetail.catchUpNo}
          >
            {isProcessing ? '...' : t.showDetail.catchUpNo}
          </button>
        </div>
      </div>
    </dialog>
  )
}
