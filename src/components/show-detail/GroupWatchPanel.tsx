import { useState } from 'react'
import BrutalDropdown from '../BrutalDropdown'
import { addShowToGroup } from '../../services/groupService'
import type { useI18n } from '../../lib/I18nContext'
import type { GroupWatchEventDoc, ShowDoc } from '../../lib/firebase-queries'
import type { MemberWithProfile, GroupWithMeta } from '../../services/groupService'
import type { MergedEpisode } from './types'

interface GroupWatchPanelProps {
  groups: GroupWithMeta[]
  selectedGroupId: string | null
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>
  uid: string | undefined
  show: ShowDoc | null
  showsInGroups: Set<string>
  setShowsInGroups: React.Dispatch<React.SetStateAction<Set<string>>>
  groupMembers: MemberWithProfile[]
  groupWatchFeed: GroupWatchEventDoc[]
  mergedEpisodes: MergedEpisode[]
  t: ReturnType<typeof useI18n>['t']
}

export default function GroupWatchPanel({
  groups, selectedGroupId, setSelectedGroupId, uid, show,
  showsInGroups, setShowsInGroups, groupMembers, groupWatchFeed,
  mergedEpisodes, t,
}: GroupWatchPanelProps) {
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [showGroupFeed, setShowGroupFeed] = useState(false)
  const userUid = uid ?? ''

  const handleAddToGroup = async () => {
    if (!uid || !show?.tmdb_id || !selectedGroupId || addingToGroup) return
    setAddingToGroup(selectedGroupId)
    try {
      await addShowToGroup(selectedGroupId, show.tmdb_id, uid)
      setShowsInGroups(prev => new Set(prev).add(selectedGroupId))
    } catch (e) { console.warn('showDetail action failed', e) }
    setAddingToGroup(null)
  }

  return (
    <>
      {groups.length > 0 && (
        <div className="bg-surface border-[3px] border-border p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase text-text-secondary">{t.watchParty.watchingTogether}</span>
          <BrutalDropdown
            value={selectedGroupId ?? ''}
            options={groups.map(g => ({ value: g.id, label: g.name }))}
            onChange={v => setSelectedGroupId(v || null)}
            placeholder={t.watchParty.justMe}
            ariaLabel={t.watchParty.selectGroup}
            buttonClassName="text-xs px-3 py-2 shadow-brutal-sm"
          />
          {selectedGroupId && (
            <button
              onClick={handleAddToGroup}
              disabled={!show?.tmdb_id || showsInGroups.has(selectedGroupId) || addingToGroup !== null}
              className={`border-2 border-border px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
                addingToGroup === selectedGroupId
                  ? 'bg-yellow/50 text-text/50 cursor-wait'
                  : showsInGroups.has(selectedGroupId)
                    ? 'bg-green/30 text-text border-green cursor-pointer'
                    : 'bg-surface text-text sm:hover:bg-yellow cursor-pointer'
              }`}
              aria-label={showsInGroups.has(selectedGroupId) ? t.groups.alreadyInGroup : t.showDetail.addShowToGroup}
            >
              {addingToGroup === selectedGroupId
                ? '...'
                : showsInGroups.has(selectedGroupId)
                  ? `✓ ${t.groups.alreadyInGroup}`
                  : `+ ${t.watchParty.addToGroup}`}
            </button>
          )}
          {groupMembers.length > 1 && (
            <div className="flex gap-1">
              {groupMembers.map(m => {
                const name = m.user_id === userUid ? t.groups.you : (m.display_name || m.user_id.slice(0, 6))
                return (
                  <span
                    key={m.user_id}
                    className="w-5 h-5 border border-border inline-flex items-center justify-center text-[8px] font-bold bg-surface"
                    title={name}
                  >
                    {m.user_id === userUid ? '★' : (name[0]?.toUpperCase() || '●')}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
      {selectedGroupId && (
        <div className="bg-surface border-[3px] border-border p-3 space-y-2">
          <button
            onClick={() => setShowGroupFeed(prev => !prev)}
            className="w-full text-left cursor-pointer"
            aria-expanded={showGroupFeed}
            aria-label={t.watchParty.activity}
          >
            <h3 className="text-[10px] font-bold uppercase text-text-secondary border-b-2 border-border pb-1 flex items-center gap-1.5 sm:hover:text-orange transition-colors">
              <span>{showGroupFeed ? '▼' : '▶'}</span>
              <span>{t.watchParty.activity}</span>
              {groupWatchFeed.length > 0 && <span className="border border-border px-1 text-[9px]">{groupWatchFeed.length}</span>}
            </h3>
          </button>
          {showGroupFeed && (
            groupWatchFeed.length === 0 ? (
              <div className="text-[10px] font-bold text-text-secondary">{t.watchParty.noActivity}</div>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {groupWatchFeed.slice(0, 10).map((ev, i) => {
                  const ep = mergedEpisodes.find(e => e.id === ev.episode_id)
                  const isYou = ev.marked_by === userUid
                  return (
                    <div key={`${ev.created_at}-${i}`} className="text-[10px] font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 border border-border ${isYou ? 'bg-yellow' : 'bg-pink'}`} />
                      <span className="text-text-secondary">{isYou ? t.groups.you : t.watchParty.aMember}</span>
                      <span>{t.watchParty.watchedEpisode.replace('{episode}', ep ? `${t.showDetail.episode} ${ep.episode_number}` : `#${ev.episode_id}`)}</span>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}
    </>
  )
}
