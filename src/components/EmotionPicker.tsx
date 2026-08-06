import { useCallback, useEffect, useRef } from 'react'
import { setEmotion } from '../services/emotionService'
import { FaceSmile2, EmojiSad, Ghost, Flame, MagicStar, EmojiNormal, Heart, Fire, Confetti, Star } from 'reicon-react'
import type { useI18n } from '../lib/I18nContext'

const EMOTIONS = [
  { id: 'happy', Icon: FaceSmile2 },
  { id: 'sad', Icon: EmojiSad },
  { id: 'scared', Icon: Ghost },
  { id: 'angry', Icon: Flame },
  { id: 'mindblown', Icon: MagicStar },
  { id: 'boring', Icon: EmojiNormal },
  { id: 'love', Icon: Heart },
  { id: 'fire', Icon: Fire },
  { id: 'party', Icon: Confetti },
  { id: 'star', Icon: Star },
] as const

export default function EmotionPicker({ uid, episodeId, currentEmotion, onSelect, onClose, t }: {
  uid: string
  episodeId: number
  currentEmotion: string | null
  onSelect: (emotionId: string | null) => void
  onClose: () => void
  t: ReturnType<typeof useI18n>['t']
}) {
  const handlePick = useCallback(async (emotionId: string | null) => {
    const val = !emotionId || emotionId === currentEmotion ? null : emotionId
    await setEmotion(uid, episodeId, val)
    onSelect(val)
    onClose()
  }, [uid, episodeId, currentEmotion, onSelect, onClose])

  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])

  return (
    <dialog ref={ref} onClose={onClose} aria-modal="true" aria-labelledby="emotion-picker-title">
      <div className="bg-surface border-[3px] border-border max-w-xs w-full mx-auto p-4 shadow-brutal-xl">
        <div id="emotion-picker-title" className="text-xs font-bold uppercase border-b-4 border-border pb-2 mb-3">{t.showDetail.howDidItFeel}</div>
        <div className="grid grid-cols-5 gap-2">
          {EMOTIONS.map(em => {
            const label = t.emotions[em.id]
            return (
              <button
                key={em.id}
                onClick={() => handlePick(em.id)}
                aria-label={label}
                className={`flex flex-col items-center gap-1 p-2 border-2 transition-all duration-150 cursor-pointer sm:hover:bg-yellow sm:hover:border-border focus-visible:outline-2 focus-visible:outline-yellow focus-visible:outline-offset-2 ${currentEmotion === em.id ? 'border-border bg-yellow shadow-brutal-sm' : 'border-border/30 bg-surface-light sm:hover:border-border/70'}`}
                title={label}
              >
                <em.Icon size={20} weight={currentEmotion === em.id ? 'Filled' : 'Outline'} />
              </button>
            )
          })}
        </div>
        {currentEmotion && (
          <button
            onClick={() => handlePick(null)}
            aria-label={t.showDetail.removeEmotion}
            className="w-full mt-3 border-2 border-border py-1 text-[10px] font-bold uppercase text-text-secondary sm:hover:bg-pink/10 transition-colors cursor-pointer"
          >
            {t.showDetail.removeEmotion}
          </button>
        )}
      </div>
    </dialog>
  )
}
