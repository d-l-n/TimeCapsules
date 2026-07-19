interface ConfirmSeasonModalProps {
  data: { seasonNumber: number; episodeIds: number[]; action: 'watch' | 'unwatch' }
  onConfirm: () => void
  onCancel: () => void
  t: any
}

export default function ConfirmSeasonModal({ data, onConfirm, onCancel, t }: ConfirmSeasonModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-4 p-6 shadow-[12px_12px_0_#111] relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center border-2 border-border bg-surface text-text font-bold text-sm hover:bg-pink transition-colors cursor-pointer"
          aria-label={t.lists.cancel}
        >
          X
        </button>
        <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-3 mb-4" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
          {data.action === 'watch' ? t.showDetail.markAllWatched : t.showDetail.markAllUnwatched}
        </h3>
        <p className="text-sm font-bold mb-6">
          {data.action === 'watch'
            ? t.showDetail.confirmMarkWatched.replace('{count}', String(data.episodeIds.length))
            : t.showDetail.confirmMarkUnwatched.replace('{count}', String(data.episodeIds.length))}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase hover:bg-pink transition-colors"
            aria-label={t.showDetail.catchUpYes}
          >
            {t.showDetail.catchUpYes}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase hover:bg-pink transition-colors"
            aria-label={t.lists.cancel}
          >
            {t.lists.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
