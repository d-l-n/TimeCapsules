import type { MergedEpisode } from './types'
import EpisodeRow from './EpisodeRow'
import type { MemberWithProfile, GroupEpisodeProgress } from '../../services/groupService'

interface SeasonSectionProps {
  season: string
  eps: MergedEpisode[]
  seasonNum: number
  watchedCount: number
  allWatched: boolean
  hasTmdbData: boolean
  collapsed: boolean
  watchedCounts: Map<number, number>
  toggling: number | null
  expandedSynopsis: Set<number>
  emotions: Map<number, string>
  resumePositions: Map<number, number>
  editingPosition: number | null
  editValue: string
  setEditValue: (v: string) => void
  editInputRef: React.RefObject<HTMLInputElement | null>
  selectedGroupId: string | null
  groupMembers: MemberWithProfile[]
  groupProgress: GroupEpisodeProgress[]
  memberSeasonProgress: { counts: Map<string, Map<number, number>>; totals: Map<number, number> }
  memberColorMap: Map<string, string>
  sortByProgress: Set<number>
  markingSeason: number | null
  spoilerFree: boolean
  avgRuntime: number
  userUid: string
  t: any
  onToggleSeason: (n: number) => void
  onMarkSeasonWatched: (n: number, ids: number[]) => void
  onMarkSeasonUnwatched: (n: number, ids: number[]) => void
  onToggle: (id: number, watched: boolean, cx?: number, cy?: number) => void
  onRewatch: (id: number) => void
  onToggleSynopsis: (id: number) => void
  onResumeClick: (id: number, current?: number) => void
  onResumeSave: (id: number, type: 'episode' | 'movie') => void
  onResumePreset: (id: number, type: 'episode' | 'movie', seconds: number) => void
  onResumeClear: (id: number, type: 'episode' | 'movie') => void
  onResumeKeyDown: (e: React.KeyboardEvent, id: number, type: 'episode' | 'movie') => void
  onSortByProgressToggle: (n: number) => void
}

export default function SeasonSection({
  season, eps, seasonNum, watchedCount, allWatched, hasTmdbData, collapsed,
  watchedCounts, toggling, expandedSynopsis, emotions, resumePositions,
  editingPosition, editValue, setEditValue, editInputRef,
  selectedGroupId, groupMembers, groupProgress, memberSeasonProgress, memberColorMap,
  sortByProgress, markingSeason, spoilerFree, avgRuntime, userUid, t,
  onToggleSeason, onMarkSeasonWatched, onMarkSeasonUnwatched,
  onToggle, onRewatch, onToggleSynopsis,
  onResumeClick, onResumeSave, onResumePreset, onResumeClear, onResumeKeyDown,
  onSortByProgressToggle,
}: SeasonSectionProps) {
  const sortedEps = (sortByProgress.has(seasonNum) && selectedGroupId && groupMembers.length > 1
    ? [...eps].sort((a, b) => {
        const aCount = groupProgress.find(p => p.episode_id === a.id)?.user_ids.length ?? 0
        const bCount = groupProgress.find(p => p.episode_id === b.id)?.user_ids.length ?? 0
        return bCount - aCount
      })
    : eps)

  return (
    <section aria-label={`${t.showDetail.season} ${season}`}>
      <div
        onClick={() => onToggleSeason(seasonNum)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggleSeason(seasonNum))}
        className="w-full text-left cursor-pointer"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`${t.showDetail.season} ${seasonNum}`}
      >
        <h2 className="text-base sm:text-lg font-black uppercase border-b-[3px] border-border pb-2 mb-4 flex items-center gap-2 sm:gap-3 flex-wrap font-heading">
          <span className="hover:text-orange transition-colors">{collapsed ? '▶' : '▼'}</span>
          <span>{t.showDetail.season} {season}</span>
          <span className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm">{hasTmdbData ? `${watchedCount} / ${eps.length}` : eps.length}</span>
          {hasTmdbData && eps.length - watchedCount > 0 && (
            <span className="text-[10px] text-text-secondary font-bold">{eps.length - watchedCount} {t.showDetail.left}</span>
          )}
          {hasTmdbData && (
            <span className="flex gap-1">
              {!allWatched && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkSeasonWatched(seasonNum, eps.map(e => e.id)) }}
                  disabled={markingSeason === seasonNum}
                  className="border-2 border-border px-3 py-0.5 text-xs font-bold bg-surface hover:bg-yellow transition-colors disabled:opacity-40"
                  aria-label={t.showDetail.markAllWatched}
                >
                  {markingSeason === seasonNum ? '...' : t.showDetail.markAllWatched}
                </button>
              )}
              {watchedCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkSeasonUnwatched(seasonNum, eps.map(e => e.id)) }}
                  disabled={markingSeason === seasonNum}
                  className="border-2 border-border px-3 py-0.5 text-xs font-bold bg-surface hover:bg-yellow transition-colors disabled:opacity-40"
                  aria-label={t.showDetail.markAllUnwatched}
                >
                  {markingSeason === seasonNum ? '...' : t.showDetail.markAllUnwatched}
                </button>
              )}
              {selectedGroupId && groupMembers.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSortByProgressToggle(seasonNum) }}
                  className={`border-2 border-border px-2 py-0.5 text-[10px] font-bold transition-colors ${sortByProgress.has(seasonNum) ? 'bg-yellow text-text' : 'bg-surface text-text hover:bg-yellow'}`}
                  title="Sort by most group members watched"
                  aria-label="Sort by group progress"
                >
                  ⇅ {sortByProgress.has(seasonNum) ? 'ON' : ''}
                </button>
              )}
            </span>
          )}
        </h2>
      </div>
      {selectedGroupId && groupMembers.length > 1 && (
        <div className="mb-3 border-2 border-border p-2 bg-surface-light">
          <div className="text-[9px] font-bold uppercase text-text-secondary mb-1.5">{t.watchParty.groupProgress}</div>
          {groupMembers.map(m => {
            const memberCount = memberSeasonProgress.counts.get(m.user_id)?.get(seasonNum) ?? 0
            const total = memberSeasonProgress.totals.get(seasonNum) ?? eps.length
            const pct = total > 0 ? Math.round((memberCount / total) * 100) : 0
            const isYou = m.user_id === userUid
            const color = memberColorMap.get(m.user_id) ?? 'var(--color-accent)'
            const name = isYou ? t.groups.you : (m.display_name || m.user_id.slice(0, 6))
            return (
              <div key={m.user_id} className="flex items-center gap-1.5 mb-1 last:mb-0">
                <span className="w-2.5 h-2.5 border border-border shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[9px] font-bold text-text-secondary truncate max-w-[60px] shrink-0" title={name}>{name}</span>
                <div className="flex-1 h-2 border border-border bg-surface relative overflow-hidden">
                  <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-[9px] font-bold text-text-secondary tabular-nums shrink-0">{memberCount}/{total}</span>
              </div>
            )
          })}
        </div>
      )}
      {!collapsed && (
        <div className="grid grid-cols-1 gap-2">
          {sortedEps.map((ep, idx) => {
            const isWatched = (watchedCounts.get(ep.id) ?? 0) > 0
            const isToggling = toggling === ep.id
            const isExpanded = expandedSynopsis.has(ep.id)
            const hasInfo = !!(ep.overview || ep.still_path || ep.air_date)
            const isCurrent = !isWatched && idx === sortedEps.findIndex(e => (watchedCounts.get(e.id) ?? 0) <= 0)
            return (
              <EpisodeRow
                key={`${ep.season_number}-${ep.episode_number}`}
                ep={ep}
                isWatched={isWatched}
                isCurrent={isCurrent}
                isToggling={isToggling}
                isExpanded={isExpanded}
                hasInfo={hasInfo}
                watchedCounts={watchedCounts}
                emotions={emotions}
                resumePositions={resumePositions}
                editingPosition={editingPosition}
                editValue={editValue}
                setEditValue={setEditValue}
                editInputRef={editInputRef}
                selectedGroupId={selectedGroupId}
                groupMembers={groupMembers}
                groupProgress={groupProgress}
                memberColorMap={memberColorMap}
                spoilerFree={spoilerFree}
                avgRuntime={avgRuntime}
                userUid={userUid}
                t={t}
                onToggle={onToggle}
                onRewatch={onRewatch}
                onToggleSynopsis={onToggleSynopsis}
                onResumeClick={onResumeClick}
                onResumeSave={onResumeSave}
                onResumePreset={onResumePreset}
                onResumeClear={onResumeClear}
                onResumeKeyDown={onResumeKeyDown}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
