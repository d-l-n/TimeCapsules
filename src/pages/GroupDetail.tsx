import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { WatchedIcon } from '../components/Icons'
import { useI18n } from '../lib/I18nContext'
import { useGroupMembers, useGroupShows, useGroupProgress } from '../hooks'
import { addShowToGroup, removeShowFromGroup, leaveGroup, isUserInGroup, getGroupInviteCode, getGroup, setGroupMovieWatched } from '../services/groupService'
import { getShowByTmdbId, createShowFromTmdb } from '../services/showService'
import { searchMulti, getPosterUrl, getTrending, tmdbLang, type TmdbSearchResult } from '../services/tmdb'
import Loading from '../components/Loading'
import ShowCard from '../components/ShowCard'
import SectionHeader from '../components/SectionHeader'
import ErrorBox from '../components/ErrorBox'
import ConfirmDialog from '../components/ConfirmDialog'

const TRENDING_LIMIT = 8

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { members, loading: membersLoading } = useGroupMembers(groupId)
  const { shows, loading: showsLoading, refresh: refreshShows } = useGroupShows(groupId)

  const [showId, setShowId] = useState<number | undefined>()
  useGroupProgress(groupId, showId)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [trending, setTrending] = useState<TmdbSearchResult[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [groupName, setGroupName] = useState<string>('')
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const [markingId, setMarkingId] = useState<number | null>(null)

  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Set of TMDB IDs already in the group — used to filter search results
  const existingShowIds = useMemo(() => new Set(shows.map(s => s.tmdb_id)), [shows])

  useEffect(() => {
    if (!user?.uid || !groupId) return
    isUserInGroup(groupId, user.uid).then(setIsMember)
  }, [user?.uid, groupId])

  useEffect(() => {
    if (!groupId) return
    getGroupInviteCode(groupId).then(setInviteCode)
    getGroup(groupId).then(g => g && setGroupName(g.name))
  }, [groupId])

  useEffect(() => {
    if (selectedShowId) {
      setShowId(selectedShowId)
    }
  }, [selectedShowId])

  // Load trending on mount
  useEffect(() => {
    setTrendingLoading(true)
    getTrending(tmdbLang(lang)).then(t => {
      setTrending(t.slice(0, TRENDING_LIMIT))
      setTrendingLoading(false)
    })
  }, [lang])

  // Debounced TMDB search with pagination
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchPage(1)
      setTotalPages(0)
      return
    }
    clearTimeout(debounceRef.current)
    setSearchPage(1)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { results, total_pages } = await searchMulti(searchQuery, tmdbLang(lang), 1)
      setSearchResults(results)
      setTotalPages(total_pages)
      setShowDropdown(results.length > 0)
      setSearching(false)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, lang])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLoadMore = async () => {
    if (!searchQuery.trim() || searching) return
    const nextPage = searchPage + 1
    if (nextPage > totalPages) return
    setSearching(true)
    const { results } = await searchMulti(searchQuery, tmdbLang(lang), nextPage)
    setSearchResults(prev => [...prev, ...results])
    setSearchPage(nextPage)
    setSearching(false)
  }

  const handleAddShow = async (item: TmdbSearchResult) => {
    if (!user?.uid || !groupId || addingId) return
    setAddingId(item.id)
    setError('')
    try {
      const existing = await getShowByTmdbId(item.id)
      if (!existing) {
        await createShowFromTmdb(
          item.id,
          item.name || item.title || '',
          item.poster_path,
          item.backdrop_path,
          item.overview,
          item.media_type as 'movie' | 'tv' | undefined,
        )
      }
      await addShowToGroup(groupId, item.id, user.uid)
      await refreshShows()
      setSearchQuery('')
      setSearchResults([])
      setShowDropdown(false)
    } catch {
      setError(t.groups.error)
    }
    setAddingId(null)
  }

  const handleRemoveShow = async (showId: number) => {
    if (!groupId || !user?.uid) return
    await removeShowFromGroup(groupId, showId)
    await refreshShows()
    if (selectedShowId === showId) setSelectedShowId(null)
  }

  const confirmRemoveShow = async () => {
    if (confirmRemove == null) return
    await handleRemoveShow(confirmRemove)
    setConfirmRemove(null)
  }

  const handleMarkWatched = async (showId: number) => {
    if (!user?.uid || !groupId || markingId !== null) return
    setMarkingId(showId)
    await setGroupMovieWatched(groupId, showId, user.uid, true)
    setMarkingId(null)
  }

  const handleLeave = async () => {
    if (!groupId || !user?.uid) return
    await leaveGroup(groupId, user.uid)
    navigate('/groups')
  }

  const handleCopyCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = inviteCode
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareCode = async () => {
    if (!inviteCode) return
    const shareText = t.groups.shareText.replace('{inviteCode}', inviteCode)

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFocus = () => {
    if (searchQuery.trim()) {
      if (searchResults.length > 0) setShowDropdown(true)
    } else {
      // Show trending when input is empty and focused
      if (trending.length > 0) setShowDropdown(true)
    }
  }

  if (membersLoading || showsLoading) return <Loading text={t.groups.loading} />

  const filteredResults = searchResults.filter(r => !existingShowIds.has(r.id))
  const hasMoreResults = searchPage < totalPages

  return (
    <div className="space-y-8">
      <div className="bg-surface border-[3px] border-border shadow-brutal p-5 sm:p-7 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="border-[3px] border-border px-3 py-1.5 bg-surface text-xs font-bold sm:hover:bg-yellow transition-colors shrink-0">&larr;</button>
          <div className="w-14 h-14 shrink-0 bg-yellow border-[3px] border-border flex items-center justify-center text-2xl font-bold text-text">
            {(groupName || t.groups.groupDetail).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{t.groups.eyebrow}</div>
            <h1 className="text-2xl sm:text-3xl font-bold uppercase leading-none font-heading truncate">{groupName || t.groups.groupDetail}</h1>
            {inviteCode && (
              <div className="text-[10px] font-mono text-text-secondary mt-1.5">{t.groups.code}: <span className="border border-border px-1 bg-surface-light">{inviteCode}</span></div>
            )}
          </div>
          <div className="border-2 border-border px-3 py-1.5 text-sm font-bold shrink-0">{members.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface border-[3px] border-border p-4 space-y-4">
            <SectionHeader id="members-heading" title={t.groups.members} count={members.length} />
              <div className="space-y-2">
                {members.map(m => {
                  const label = m.user_id === user?.uid ? t.groups.you : (m.display_name || m.user_id.slice(0, 8))
                  return (
                    <div key={m.user_id} className="flex items-center gap-2 border-2 border-border p-2">
                      <div className="w-7 h-7 bg-yellow border-2 border-border flex items-center justify-center text-[11px] font-bold text-text shrink-0">
                        {label.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold truncate flex-1">{label}</span>
                      {m.role === 'admin' && <span className="text-[10px] border border-border px-1 font-bold uppercase shrink-0">{t.groups.admin}</span>}
                    </div>
                  )
                })}
              </div>
            {isMember && (
              <button
                onClick={() => setConfirmLeave(true)}
                aria-label={t.groups.leaveGroup}
                className="w-full border-2 border-border bg-pink/10 text-pink py-2 text-xs font-bold uppercase sm:hover:bg-pink sm:hover:text-text transition-colors cursor-pointer"
              >
                {t.groups.leaveGroup}
              </button>
            )}
          </div>

          {isMember && inviteCode && (
            <div className="bg-surface border-[3px] border-border p-4 space-y-3">
              <h2 className="text-sm font-bold uppercase">{t.groups.inviteCode}</h2>
              <div className="border-2 border-border bg-surface-light px-3 py-2 text-center">
                <span className="text-lg font-bold font-mono tracking-widest">{inviteCode}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 border-[3px] border-border bg-yellow text-text py-2 text-xs font-bold uppercase sm:hover:bg-orange sm:hover:text-text transition-colors cursor-pointer"
                >
                  {copied ? t.groups.copied : t.groups.copyCode}
                </button>
                <button
                  onClick={handleShareCode}
                  className="flex-1 border-[3px] border-border bg-surface text-text py-2 text-xs font-bold uppercase sm:hover:bg-yellow transition-colors cursor-pointer"
                >
                  {t.groups.shareCode}
                </button>
              </div>
            </div>
          )}

          {isMember && (
            <div className="bg-surface border-[3px] border-border p-4 space-y-4" ref={searchRef}>
              <h2 className="text-sm font-bold uppercase">{t.groups.addShow}</h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setError('') }}
                  onFocus={handleFocus}
                  placeholder={t.groups.showSearchPlaceholder}
                  aria-label={t.groups.showSearchPlaceholder}
                  className="w-full border-2 border-border bg-surface px-3 py-2 text-xs font-bold uppercase outline-none focus:bg-yellow/30 pr-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false) }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 border border-border px-1.5 py-0.5 text-[10px] font-bold bg-surface sm:hover:bg-pink transition-colors"
                    aria-label={t.discover.clear}
                  >
                    X
                  </button>
                )}
                {searching && searchQuery.trim() && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-secondary">...</div>
                )}

                {/* Trending dropdown (shown when input is empty and focused) */}
                {showDropdown && !searchQuery.trim() && trending.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 border-[3px] border-border bg-surface shadow-brutal max-h-80 overflow-y-auto">
                    <div className="sticky top-0 bg-surface border-b-2 border-border px-3 py-2 text-[10px] font-bold uppercase text-text-secondary">
                      {trendingLoading ? t.groups.trendingLoading : t.groups.trending}
                    </div>
                    {trendingLoading ? (
                      <div className="p-4 text-center">
                        <span className="text-[10px] font-bold text-text-secondary">...</span>
                      </div>
                    ) : (
                      trending.map(item => (
                        <SearchResultItem
                          key={item.id}
                          item={item}
                          alreadyInGroup={existingShowIds.has(item.id)}
                          addingId={addingId}
                          t={t}
                          onAdd={handleAddShow}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Search results dropdown */}
                {showDropdown && searchQuery.trim() && filteredResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 border-[3px] border-border bg-surface shadow-brutal max-h-80 overflow-y-auto">
                    {filteredResults.map(item => (
                      <SearchResultItem
                        key={item.id}
                        item={item}
                        alreadyInGroup={existingShowIds.has(item.id)}
                        addingId={addingId}
                        t={t}
                        onAdd={handleAddShow}
                      />
                    ))}
                    {hasMoreResults && (
                      <button
                        onClick={handleLoadMore}
                        disabled={searching}
                        className="w-full border-t-2 border-border px-3 py-3 text-[10px] font-bold uppercase bg-surface sm:hover:bg-yellow/30 transition-colors disabled:opacity-40 cursor-pointer text-center"
                      >
                        {searching ? '…' : t.groups.seeMore}
                      </button>
                    )}
                  </div>
                )}

                {/* No results state */}
                {searchQuery.trim() && !searching && searchResults.length > 0 && filteredResults.length === 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 border-[3px] border-border bg-surface p-4 text-center">
                    <span className="text-[10px] font-bold text-text-secondary">{t.groups.searchNoResults}</span>
                  </div>
                )}

                {/* Raw no results from TMDB */}
                {searchQuery.trim() && !searching && searchResults.length === 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 border-[3px] border-border bg-surface p-4 text-center">
                    <span className="text-[10px] font-bold text-text-secondary">{t.groups.searchNoResults}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <SectionHeader id="shows-heading" title={t.groups.shows} count={shows.length} />
          {shows.length === 0 ? (
            <div className="border-[3px] border-border bg-surface p-6 text-center text-xs font-bold text-text-secondary">{t.groups.noShows}</div>
          ) : (
            <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start">
              {shows.map(s => {
                const selected = selectedShowId === s.tmdb_id
                return (
                  <div key={s.tmdb_id} className={selected ? 'col-span-full' : ''}>
                    <ShowCard
                      id={s.tmdb_id}
                      name={s.name}
                      posterUrl={s.poster_url}
                      imdbRating={s.imdb_rating}
                      mediaType={s.media_type}
                      wrapperClassName={`${selected ? 'ring-2 ring-yellow' : ''}`}
                      onRemove={isMember ? () => setConfirmRemove(s.tmdb_id) : undefined}
                      actions={(
                        <>
                          {s.media_type === 'movie' && (
                            <button
                              onClick={() => handleMarkWatched(s.tmdb_id)}
                              disabled={markingId === s.tmdb_id}
                              aria-label={t.showDetail.markAsWatched}
                              className="btn-brutal btn-accent text-[9px] px-2 py-1 text-text flex-1"
                            >
                              {markingId === s.tmdb_id ? '…' : t.showDetail.markAsWatched}
                            </button>
                          )}
                          {s.media_type !== 'movie' && (
                            <button
                              onClick={() => setSelectedShowId(selected ? null : s.tmdb_id)}
                              aria-label={t.groups.progress}
                              className={`btn-brutal text-[9px] px-2 py-1 flex-1 ${selected ? 'bg-yellow' : 'bg-surface'}`}
                            >
                              {t.groups.progress}
                            </button>
                          )}
                        </>
                      )}
                    />
                    {selected && (
                      <div className="mt-4">
                        <GroupProgressSection
                          groupId={groupId!}
                          showId={s.tmdb_id}
                          mediaType={s.media_type}
                          members={members}
              userId={user?.uid}
              t={t}
            />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {error && <ErrorBox message={error} className="mb-4" />}

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={t.groups.leaveTitle}
        message={t.groups.leaveConfirm}
        confirmLabel={t.groups.leaveBtn}
        confirmAction={handleLeave}
        cancelLabel={t.lists.cancel}
        variant="danger"
      />

      <ConfirmDialog
        open={confirmRemove != null}
        onClose={() => setConfirmRemove(null)}
        title={t.groups.removeTitle}
        message={t.groups.removeConfirm}
        confirmLabel={t.groups.removeBtn}
        confirmAction={confirmRemoveShow}
        cancelLabel={t.lists.cancel}
        variant="danger"
      />
    </div>
  )
}

// Extracted search result item for reusable rendering
function SearchResultItem({ item, alreadyInGroup, addingId, t, onAdd }: {
  item: TmdbSearchResult
  alreadyInGroup: boolean
  addingId: number | null
  t: any
  onAdd: (item: TmdbSearchResult) => void
}) {
  const name = item.name || item.title || ''
  const year = (item.first_air_date || item.release_date || '').slice(0, 4)
  const posterUrl = getPosterUrl(item.poster_path)
  const rating = item.vote_average ?? 0
  const isMovie = item.media_type === 'movie'
  const isAdding = addingId === item.id

  return (
    <button
      onClick={() => !alreadyInGroup && onAdd(item)}
      disabled={alreadyInGroup || isAdding}
      className={`w-full flex items-center gap-3 px-3 py-2.5 border-b-2 border-border text-left disabled:opacity-50 cursor-pointer transition-colors ${
        alreadyInGroup
          ? 'bg-surface-light cursor-not-allowed'
          : 'sm:hover:bg-yellow/30'
      }`}
    >
      {/* Poster thumbnail */}
      <div className="w-9 h-[54px] shrink-0 bg-surface-light border-2 border-border overflow-hidden">
        {posterUrl ? (
          <img src={posterUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-text-secondary uppercase p-0.5 text-center leading-tight">
            {name.slice(0, 3)}
          </div>
        )}
      </div>

      {/* Text info */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase truncate flex items-center gap-1.5">
          {name}
          {rating > 0 && (
            <span className="shrink-0 border border-border px-1 py-[1px] text-[9px] font-bold leading-none">{rating.toFixed(1)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {year && <span className="text-[10px] font-mono text-text-secondary">{year}</span>}
          <span className={`border px-1 text-[9px] font-bold uppercase leading-none py-[1px] ${
            'border-yellow text-text bg-yellow/5'
          }`}>
            {isMovie ? t.discover.movie : t.discover.tv}
          </span>
          {alreadyInGroup && (
            <span className="border border-pink px-1 text-[9px] font-bold uppercase leading-none py-[1px] text-pink bg-pink/5">
              {t.groups.alreadyInGroup}
            </span>
          )}
        </div>
      </div>

      {/* Add button (hidden for already-in-group items) */}
      {!alreadyInGroup && (
        <span className={`border-2 border-border px-2.5 py-1 text-[10px] font-bold shrink-0 transition-colors ${
          isAdding ? 'bg-yellow text-text' : 'bg-yellow text-text'
        }`}>
          {isAdding ? '…' : t.groups.addShowBtn}
        </span>
      )}
    </button>
  )
}

function GroupProgressSection({ groupId, showId, mediaType, members, userId, t }: {
  groupId: string
  showId: number
  mediaType?: 'movie' | 'tv' | null
  members: { user_id: string; role: string; joined_at: string }[]
  userId: string | undefined
  t: any
}) {
  const { progress, loading } = useGroupProgress(groupId, showId)
  if (loading) return <Loading text={t.groups.loading} />

  const isMovie = mediaType === 'movie'
  const memberLabel = (uid: string) => uid === userId ? t.groups.you : uid.slice(0, 8)
  const watchedMembers = members.filter(m => progress.some(p => p.user_ids.includes(m.user_id)))
  const pct = members.length ? Math.round((watchedMembers.length / members.length) * 100) : 0

  return (
    <div className="bg-surface border-[3px] border-border shadow-brutal">
      <div className="flex items-center justify-between border-b-4 border-border px-4 py-3">
        <h3 className="text-sm font-bold uppercase">{isMovie ? t.groups.movieProgress : t.groups.episodeProgress}</h3>
        <span className="text-[10px] font-mono text-text-secondary">
          {isMovie ? `${watchedMembers.length}/${members.length}` : `${progress.length} EP`}
        </span>
      </div>

      {progress.length === 0 ? (
        <div className="p-4 text-xs text-text-secondary font-bold">{isMovie ? t.groups.noMovieProgress : t.groups.noProgress}</div>
      ) : isMovie ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 border-2 border-border bg-surface overflow-hidden">
              <div className="h-full bg-yellow" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono text-text-secondary">{pct}%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map(m => {
              const watched = watchedMembers.includes(m)
              return (
                <span
                  key={m.user_id}
                  className={`flex items-center gap-1 text-[10px] font-bold uppercase border-2 px-1.5 py-0.5 ${watched ? 'border-border bg-yellow text-text' : 'border-border bg-surface text-text-secondary'}`}
                >
                  {watched ? <WatchedIcon className="w-3 h-3" /> : '—'} {memberLabel(m.user_id)}
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b-2 border-border px-4 py-2 bg-surface-light">
            {members.map(m => (
              <span key={m.user_id} className="flex items-center gap-1 text-[10px] font-bold uppercase">
                <span className="w-3 h-3 border-2 border-border bg-yellow" />
                {memberLabel(m.user_id)}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border max-h-72 overflow-y-auto">
            {progress.slice(0, 200).map(p => {
              const watched = members.filter(m => p.user_ids.includes(m.user_id))
              const epPct = members.length ? Math.round((watched.length / members.length) * 100) : 0
              return (
                <div key={p.episode_id} className="bg-surface p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">EP #{Math.abs(p.episode_id)}</span>
                    <span className="text-[9px] font-mono text-text-secondary">{epPct}%</span>
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {members.map(m => (
                      <span
                        key={m.user_id}
                        className={`w-3.5 h-3.5 border border-border inline-block ${p.user_ids.includes(m.user_id) ? 'bg-accent' : 'bg-surface'}`}
                        title={memberLabel(m.user_id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
