import { setRating as setRatingService } from '../../services/showService'
import type { RatingDoc } from '../../lib/firebase-queries'

interface RatingPickerProps {
  rating: RatingDoc | null
  showTmdbId: number
  userUid: string
  setRating: (r: RatingDoc | null) => void
  onClose: () => void
  t: any
}

export default function RatingPicker({ rating, showTmdbId, userUid, setRating, onClose, t }: RatingPickerProps) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 bg-surface border-4 border-border z-20 shadow-brutal p-2 min-w-48">
        <div className="grid grid-cols-5 gap-1 mb-2">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              aria-label={`Rate ${n}`}
              onClick={async () => {
                await setRatingService(userUid, showTmdbId, n)
                setRating(rating ? { ...rating, rating: n } : { user_id: userUid, show_id: showTmdbId, rating: n, rated_at: new Date().toISOString() })
                onClose()
              }}
              className={`w-8 h-8 border-2 border-border text-xs font-bold hover:bg-accent transition-colors cursor-pointer ${rating?.rating === n ? 'bg-accent text-text' : 'bg-surface'}`}
            >
              {n}
            </button>
          ))}
        </div>
        {rating && (
          <button
            onClick={async () => {
              await setRatingService(userUid, showTmdbId, null)
              setRating(null)
              onClose()
            }}
            className="w-full border-2 border-border px-2 py-1 text-[10px] font-bold bg-surface text-highlight hover:bg-highlight hover:text-bg transition-colors cursor-pointer"
            aria-label="Clear rating"
          >
            {t.showDetail.clearRating ?? 'CLEAR'}
          </button>
        )}
      </div>
    </>
  )
}
