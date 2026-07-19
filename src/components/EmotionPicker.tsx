import { useCallback } from 'react'
import { setEmotion } from '../services/emotionService'

const EMOTIONS = [
  { id: 'happy', label: 'Happy' },
  { id: 'sad', label: 'Sad' },
  { id: 'scared', label: 'Scared' },
  { id: 'angry', label: 'Angry' },
  { id: 'mindblown', label: 'Mind Blown' },
  { id: 'boring', label: 'Boring' },
  { id: 'love', label: 'Love' },
  { id: 'fire', label: 'Fire' },
  { id: 'party', label: 'Party' },
  { id: 'star', label: 'Amazing' },
]

export default function EmotionPicker({ uid, episodeTvTimeId, currentEmotion, onSelect, onClose }: {
  uid: string
  episodeTvTimeId: number
  currentEmotion: string | null
  onSelect: (emotionId: string | null) => void
  onClose: () => void
}) {
  const handlePick = useCallback(async (emotionId: string) => {
    await setEmotion(uid, episodeTvTimeId, emotionId === currentEmotion ? null : emotionId)
    onSelect(emotionId === currentEmotion ? null : emotionId)
    onClose()
  }, [uid, episodeTvTimeId, currentEmotion, onSelect, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-surface border-[3px] border-border max-w-xs w-full mx-4 p-4 shadow-[12px_12px_0_#111]" onClick={e => e.stopPropagation()}>
        <div className="text-xs font-bold uppercase border-b-4 border-border pb-2 mb-3">How did it make you feel?</div>
        <div className="grid grid-cols-5 gap-2">
          {EMOTIONS.map(em => (
            <button
              key={em.id}
              onClick={() => handlePick(em.id)}
              aria-label={em.label}
              className={`text-[10px] font-bold uppercase p-2 border-2 transition-colors cursor-pointer hover:bg-yellow ${currentEmotion === em.id ? 'border-border bg-yellow' : 'border-transparent bg-surface'}`}
              title={em.label}
            >
              {em.label.split(' ').map(w => w[0]).join('')}
            </button>
          ))}
        </div>
        {currentEmotion && (
          <button
            onClick={() => handlePick('')}
            aria-label="Remove emotion"
            className="w-full mt-3 border-2 border-border py-1 text-[10px] font-bold uppercase text-text-secondary hover:bg-pink/10 transition-colors cursor-pointer"
          >
            Remove emotion
          </button>
        )}
      </div>
    </div>
  )
}
