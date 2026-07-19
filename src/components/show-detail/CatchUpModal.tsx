interface CatchUpModalProps {
  data: { episodeId: number; prevIds: number[]; hasPrevSeasons: boolean; seasonEpisodeIds?: number[] }
  onCatchUp: (markAll: boolean) => void
  onClose: () => void
  t: any
}

export default function CatchUpModal({ data, onCatchUp, onClose, t }: CatchUpModalProps) {
  const n = data.prevIds.length
  const message = data.hasPrevSeasons
    ? (n === 1 ? t.showDetail.catchUpPrevSeason : t.showDetail.catchUpPrevSeasonPlural).replace('{count}', String(n))
    : (n === 1 ? t.showDetail.catchUpSameSeason : t.showDetail.catchUpSameSeasonPlural).replace('{count}', String(n))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" aria-label={t.showDetail.catchUpTitle} onClick={onClose}>
      <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-4 p-6 shadow-[12px_12px_0_#111] relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center border-2 border-border bg-surface text-text font-bold text-sm hover:bg-pink transition-colors cursor-pointer"
          aria-label={t.lists.cancel}
        >
          X
        </button>
        <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-3 mb-4" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>{t.showDetail.catchUpTitle}</h3>
        <p className="text-sm font-bold mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => onCatchUp(true)}
            className="flex-1 border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase hover:bg-pink transition-colors"
            aria-label={t.showDetail.catchUpYes}
          >
            {t.showDetail.catchUpYes}
          </button>
          <button
            onClick={() => onCatchUp(false)}
            className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase hover:bg-yellow transition-colors"
            aria-label={t.showDetail.catchUpNo}
          >
            {t.showDetail.catchUpNo}
          </button>
        </div>
      </div>
    </div>
  )
}
