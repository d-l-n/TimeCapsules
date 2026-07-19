import { PRESET_TIMES, fmtPos } from './types'

interface PositionEditorProps {
  contentId: number
  contentType: 'episode' | 'movie'
  maxSeconds: number
  editValue: string
  setEditValue: (v: string) => void
  editInputRef: React.RefObject<HTMLInputElement | null>
  currentSeconds: number | undefined
  onSave: (id: number, type: 'episode' | 'movie') => void
  onPreset: (id: number, type: 'episode' | 'movie', seconds: number) => void
  onClear: (id: number, type: 'episode' | 'movie') => void
  onKeyDown: (e: React.KeyboardEvent, id: number, type: 'episode' | 'movie') => void
  t: any
  compact?: boolean
}

export default function PositionEditor({ contentId, contentType, maxSeconds, editValue, setEditValue, editInputRef, currentSeconds, onSave, onPreset, onClear, onKeyDown, t, compact }: PositionEditorProps) {
  const h = Math.floor(maxSeconds / 3600)
  const m = Math.floor((maxSeconds % 3600) / 60)
  const maxLabel = h > 0 ? `${h}h ${m}m` : `${m}m`
  const pct = currentSeconds != null && maxSeconds > 0 ? Math.min(100, Math.round((currentSeconds / maxSeconds) * 100)) : 0
  const presets = compact ? PRESET_TIMES.slice(0, 4) : PRESET_TIMES

  function parseSlider(s: string) {
    const n = parseInt(s)
    if (isNaN(n)) return ''
    const secs = Math.min(n, maxSeconds)
    const hh = Math.floor(secs / 3600)
    const mm = Math.floor((secs % 3600) / 60)
    const ss = secs % 60
    if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  function sliderValue(): number {
    if (!editValue.trim()) return 0
    const parts = editValue.split(':')
    if (parts.length === 1) return parseInt(parts[0]) || 0
    if (parts.length === 2) return parseInt(parts[0]) * 60 + (parseInt(parts[1]) || 0)
    if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + (parseInt(parts[2]) || 0)
    return 0
  }

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? 'shrink-0' : ''}`}>
      {maxSeconds > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 border border-border bg-surface relative overflow-hidden">
            <div className="h-full transition-all duration-200 bg-yellow" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] font-bold text-text-secondary tabular-nums whitespace-nowrap">
            {currentSeconds != null ? fmtPos(currentSeconds) : '--'} / {maxLabel}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1 flex-wrap">
        {presets.map(pt => (
          <button
            key={pt.seconds}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onPreset(contentId, contentType, pt.seconds)}
            className={`border-2 border-border font-bold bg-surface hover:bg-yellow transition-colors cursor-pointer ${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'}`}
            aria-label={`${t.showDetail.setPosition} ${pt.label}`}
          >
            {pt.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <input
          type="range"
          min={0}
          max={maxSeconds}
          value={sliderValue()}
          onChange={e => setEditValue(parseSlider(e.target.value))}
          className="flex-1 h-4 accent-accent min-w-[60px] cursor-pointer"
          aria-label={t.showDetail.setPosition}
        />
        <input
          ref={editInputRef}
          type="text"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => onSave(contentId, contentType)}
          onKeyDown={e => onKeyDown(e, contentId, contentType)}
          className={`border-2 border-border bg-surface text-text font-bold px-1 ${compact ? 'w-12 text-[9px]' : 'w-14 text-[10px]'}`}
          aria-label={t.showDetail.setPosition}
        />
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={() => onClear(contentId, contentType)}
          className={`border-2 border-border font-bold bg-surface text-pink hover:bg-pink hover:text-bg transition-colors cursor-pointer ${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'}`}
          aria-label={`${t.showDetail.setPosition} — clear`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
