import { getTmdbImage } from '../../services/tmdb'
import { getEmoji } from '../../services/emotionService'
import type { MemberWithProfile, GroupEpisodeProgress } from '../../services/groupService'
import type { MergedEpisode } from './types'
import { fmtPos } from './types'
import PositionEditor from './PositionEditor'
import { WatchedIcon, RewatchIcon, TimerIcon } from '..'
import type { useI18n } from '../../lib/I18nContext'

interface EpisodeRowProps {
  ep: MergedEpisode
  isWatched: boolean
  isCurrent?: boolean
  isToggling: boolean
  isExpanded: boolean
  hasInfo: boolean
  watchedCounts: Map<number, number>
  emotions: Map<number, string>
  resumePositions: Map<number, number>
  editingPosition: number | null
  editValue: string
  setEditValue: (v: string) => void
  editInputRef: React.RefObject<HTMLInputElement | null>
  selectedGroupId: string | null
  groupMembers: MemberWithProfile[]
  groupProgress: GroupEpisodeProgress[]
  memberColorMap: Map<string, string>
  spoilerFree: boolean
  avgRuntime: number
  userUid: string
  t: ReturnType<typeof useI18n>['t']
  onToggle: (id: number, watched: boolean, cx?: number, cy?: number) => void
  onRewatch: (id: number) => void
  onToggleSynopsis: (id: number) => void
  onResumeClick: (id: number, current?: number) => void
  onResumeSave: (id: number, type: 'episode' | 'movie') => void
  onResumePreset: (id: number, type: 'episode' | 'movie', seconds: number) => void
  onResumeClear: (id: number, type: 'episode' | 'movie') => void
  onResumeKeyDown: (e: React.KeyboardEvent, id: number, type: 'episode' | 'movie') => void
}

export default function EpisodeRow({
  ep, isWatched, isCurrent, isToggling, isExpanded, hasInfo,
  watchedCounts, emotions, resumePositions, editingPosition, editValue, setEditValue, editInputRef,
  selectedGroupId, groupMembers, groupProgress, memberColorMap,
  spoilerFree, avgRuntime, userUid, t,
  onToggle, onRewatch, onToggleSynopsis,
  onResumeClick, onResumeSave, onResumePreset, onResumeClear, onResumeKeyDown,
}: EpisodeRowProps) {
  const rowBg = isWatched ? 'bg-green' : isCurrent ? 'bg-blue text-text' : 'bg-surface'
  return (
    <div className="border-2 border-border">
      <div className="flex">
        <button
          onClick={(e) => onToggle(ep.id, isWatched, e.clientX, e.clientY)}
          disabled={isToggling}
          className={`flex-1 min-w-0 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-3 transition-all text-left ${rowBg} ${!isWatched && !isCurrent ? 'sm:hover:bg-yellow' : ''}`}
          aria-label={`${t.showDetail.episode} ${ep.episode_number}${ep.title ? ` — ${ep.title}` : ''}${isWatched ? ` — ${t.showDetail.watched}` : ''}`}
        >
          <span className={`border-2 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs shrink-0 flex items-center gap-1 ${isWatched ? 'border-text bg-green text-text' : isCurrent ? 'border-text bg-blue text-text' : 'border-border bg-surface text-text'}`} aria-hidden="true">
            {isToggling ? '...' : isWatched ? <><WatchedIcon className="w-3 h-3" />{watchedCounts.get(ep.id)! > 1 && `×${watchedCounts.get(ep.id)}`}</> : `E${ep.episode_number}`}
          </span>
          <span className={`truncate ${isWatched ? 'line-through opacity-70' : ''}`}>{ep.title}</span>
        </button>
        {isWatched && (
          <button
            onClick={(e) => { e.stopPropagation(); onRewatch(ep.id) }}
            disabled={isToggling}
              className={`shrink-0 px-1.5 text-xs font-bold border-2 border-border transition-colors ${isToggling ? 'bg-green/50 text-text/50 cursor-wait' : 'bg-surface text-text sm:hover:bg-green cursor-pointer'}`}
            title={isToggling ? 'Toggling...' : 'Rewatch'}
            aria-label="Mark as rewatched"
          >
            {isToggling ? '...' : <RewatchIcon className="w-3.5 h-3.5" />}
          </button>
        )}
        {emotions.has(ep.id) && (
          <span className="shrink-0 text-sm px-1 flex items-center" title={emotions.get(ep.id)!}>{getEmoji(emotions.get(ep.id)!)}</span>
        )}
        {selectedGroupId && groupMembers.length > 1 && (
          <GroupProgressPopover
            members={groupMembers}
            episodeId={ep.id}
            groupProgress={groupProgress}
            userId={userUid}
            memberColorMap={memberColorMap}
            t={t}
          />
        )}
        {editingPosition === ep.id ? (
          <PositionEditor
            contentId={ep.id}
            contentType="episode"
            maxSeconds={avgRuntime > 0 ? avgRuntime * 60 : 3600}
            editValue={editValue}
            setEditValue={setEditValue}
            editInputRef={editInputRef}
            currentSeconds={resumePositions.get(ep.id)}
            onSave={onResumeSave}
            onPreset={onResumePreset}
            onClear={onResumeClear}
            onKeyDown={onResumeKeyDown}
            t={t}
            compact
          />
        ) : (
          <button
            onClick={() => onResumeClick(ep.id, resumePositions.get(ep.id))}
            className="shrink-0 border-2 border-border px-1.5 py-1 text-[10px] font-bold bg-surface text-text sm:hover:bg-yellow transition-colors flex items-center gap-1"
            aria-label={t.showDetail.resumePosition}
          >
            <TimerIcon className="w-3 h-3" /> {resumePositions.has(ep.id) ? fmtPos(resumePositions.get(ep.id)!) : t.showDetail.noPosition}
          </button>
        )}
        {hasInfo && (
          <button
            onClick={() => onToggleSynopsis(ep.id)}
            className={`shrink-0 px-3 text-xs font-bold border-l-2 border-border transition-colors ${isExpanded ? 'bg-yellow text-text' : 'bg-surface text-text sm:hover:bg-yellow'}`}
            aria-label={`${t.showDetail.info} — ${ep.title}`}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        )}
      </div>
      {isExpanded && hasInfo && (
        <div className="border-t-2 border-border px-4 py-3 bg-surface text-sm flex flex-col sm:flex-row gap-4">
          {ep.still_path && !(spoilerFree && !isWatched) && (
            <div className="sm:w-48 shrink-0">
              <img src={getTmdbImage(ep.still_path, 'w500')!} alt="" className="w-full border-2 border-border" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            {ep.overview && !(spoilerFree && !isWatched) && (
              <div>
                <div className="text-xs font-bold uppercase text-text-secondary mb-1">{t.showDetail.synopsis}</div>
                <p className="text-text-secondary leading-relaxed">{ep.overview}</p>
              </div>
            )}
            {!ep.overview && !(spoilerFree && !isWatched) && <p className="text-text-secondary italic">{t.showDetail.noSynopsis}</p>}
            {spoilerFree && !isWatched && <p className="text-text-secondary italic">{t.showDetail.spoilerHidden}</p>}
            {ep.air_date && (
              <div className="text-xs font-bold text-text-secondary uppercase">{t.showDetail.airDate}: {ep.air_date}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GroupProgressPopover({ members, episodeId, groupProgress, userId, memberColorMap, t }: {
  members: MemberWithProfile[]
  episodeId: number
  groupProgress: GroupEpisodeProgress[]
  userId: string
  memberColorMap: Map<string, string>
  t: ReturnType<typeof useI18n>['t']
}) {
  const watchedBy = groupProgress.find(p => p.episode_id === episodeId)
  const watchedUserIds = new Set(watchedBy?.user_ids ?? [])
  const watchers = members.filter(m => watchedUserIds.has(m.user_id))
  const nonWatchers = members.filter(m => !watchedUserIds.has(m.user_id))

  return (
    <div className="relative group cursor-pointer px-2 shrink-0">
      <div className="flex gap-px items-center" aria-label={t.watchParty.groupProgress}>
        {members.map(m => {
          const isWatched = watchedUserIds.has(m.user_id)
          const isYou = m.user_id === userId
          const color = memberColorMap.get(m.user_id) ?? 'var(--color-accent)'
          const name = isYou ? t.groups.you : (m.display_name || m.user_id.slice(0, 6))
          return (
            <span
              key={m.user_id}
              className="w-3 h-3 border border-border text-[7px] font-bold flex items-center justify-center transition-colors"
              style={{ backgroundColor: isWatched ? color : undefined, borderColor: isWatched ? color : undefined, opacity: isWatched ? 1 : 0.3 }}
            >
              {isYou ? '★' : isWatched ? name[0]?.toUpperCase() || '●' : ''}
            </span>
          )
        })}
      </div>
      <div className="absolute bottom-full right-0 mb-1 z-50 hidden sm:group-hover:block group-focus-within:block min-w-40">
        <div className="bg-surface border-2 border-border shadow-brutal p-2 space-y-1">
          <div className="text-[9px] font-bold uppercase text-text-secondary border-b-2 border-border pb-1 mb-1">{t.watchParty.groupProgress}</div>
          {watchers.length === 0 && <div className="text-[9px] text-text-secondary">—</div>}
          {watchers.map(m => {
            const isYou = m.user_id === userId
            const name = isYou ? t.groups.you : (m.display_name || m.user_id.slice(0, 6))
            const color = memberColorMap.get(m.user_id) ?? 'var(--color-accent)'
            return (
              <div key={m.user_id} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 border border-border shrink-0" style={{ backgroundColor: color }} />
                <span className="font-bold truncate">{name}</span>
                <span className="text-text-secondary ml-auto shrink-0">OK</span>
              </div>
            )
          })}
          {nonWatchers.length > 0 && watchers.length > 0 && <div className="border-t-2 border-border pt-1 mt-1" />}
          {nonWatchers.map(m => {
            const isYou = m.user_id === userId
            const name = isYou ? t.groups.you : (m.display_name || m.user_id.slice(0, 6))
            return (
              <div key={m.user_id} className="flex items-center gap-1.5 text-[10px] opacity-50">
                <span className="w-2 h-2 border border-border shrink-0" />
                <span className="font-bold truncate">{name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
