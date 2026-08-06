import { useCallback } from 'react'
import { setEmotion } from '../../services/emotionService'
import { FaceSmile2, Heart, Fire, Confetti, Star } from 'reicon-react'
import type { useI18n } from '../../lib/I18nContext'

const REACTIONS = [
  { id: 'love', Icon: Heart },
  { id: 'happy', Icon: FaceSmile2 },
  { id: 'fire', Icon: Fire },
  { id: 'party', Icon: Confetti },
  { id: 'star', Icon: Star },
] as const

export default function SeriesReactions({ episodeId, uid, currentEmotion, onSelect, onClose, t }: {
  episodeId: number
  uid: string
  currentEmotion: string | null
  onSelect: (emotionId: string | null) => void
  onClose: () => void
  t: ReturnType<typeof useI18n>['t']
}) {
  const handlePick = useCallback(async (emotionId: string) => {
    const val = emotionId === currentEmotion ? null : emotionId
    await setEmotion(uid, episodeId, val)
    onSelect(val)
    onClose()
  }, [uid, episodeId, currentEmotion, onSelect, onClose])

  return (
    <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t-2 border-border/50">
      {REACTIONS.map(em => {
        const active = currentEmotion === em.id
        const label = t.emotions[em.id]
        return (
          <button
            key={em.id}
            onClick={() => handlePick(em.id)}
            aria-label={label}
            className={`p-1.5 border-2 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${
              active
                ? 'border-yellow bg-yellow/20 shadow-brutal-sm'
                : 'border-border/30 bg-surface-light hover:border-yellow hover:bg-yellow/10'
            }`}
            title={label}
          >
            <em.Icon size={18} weight={active ? 'Filled' : 'Outline'} />
          </button>
        )
      })}
    </div>
  )
}
