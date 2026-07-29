import { useCallback, useEffect, useRef } from 'react'
import { setEmotion } from '../services/emotionService'
import { FaceSmile2, EmojiSad, Ghost, Flame, MagicStar, EmojiNormal, Heart, Fire, Confetti, Star } from 'reicon-react'

const EMOTIONS = [
  { id: 'happy', label: 'Happy', Icon: FaceSmile2 },
  { id: 'sad', label: 'Sad', Icon: EmojiSad },
  { id: 'scared', label: 'Scared', Icon: Ghost },
  { id: 'angry', label: 'Angry', Icon: Flame },
  { id: 'mindblown', label: 'Mind Blown', Icon: MagicStar },
  { id: 'boring', label: 'Boring', Icon: EmojiNormal },
  { id: 'love', label: 'Love', Icon: Heart },
  { id: 'fire', label: 'Fire', Icon: Fire },
  { id: 'party', label: 'Party', Icon: Confetti },
  { id: 'star', label: 'Amazing', Icon: Star },
]

export default function EmotionPicker({ uid, episodeId, currentEmotion, onSelect, onClose }: {
  uid: string
  episodeId: number
  currentEmotion: string | null
  onSelect: (emotionId: string | null) => void
  onClose: () => void
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
    <dialog ref={ref} onClose={onClose}>
      <div className="bg-surface border-[3px] border-border max-w-xs w-full mx-auto p-4 shadow-brutal-xl">
        <div className="text-xs font-bold uppercase border-b-4 border-border pb-2 mb-3">How did it make you feel?</div>
        <div className="grid grid-cols-5 gap-2">
          {EMOTIONS.map(em => (
            <button
              key={em.id}
              onClick={() => handlePick(em.id)}
              aria-label={em.label}
              className={`flex flex-col items-center gap-1 p-2 border-2 transition-all duration-150 cursor-pointer sm:hover:bg-yellow sm:hover:border-border focus-visible:outline-2 focus-visible:outline-yellow focus-visible:outline-offset-2 ${currentEmotion === em.id ? 'border-border bg-yellow shadow-brutal-sm' : 'border-border/30 bg-surface-light sm:hover:border-border/70'}`}
              title={em.label}
            >
              <em.Icon size={20} weight={currentEmotion === em.id ? 'Filled' : 'Outline'} />
            </button>
          ))}
        </div>
        {currentEmotion && (
          <button
            onClick={() => handlePick(null)}
            aria-label="Remove emotion"
            className="w-full mt-3 border-2 border-border py-1 text-[10px] font-bold uppercase text-text-secondary sm:hover:bg-pink/10 transition-colors cursor-pointer"
          >
            Remove emotion
          </button>
        )}
      </div>
    </dialog>
  )
}
