import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/I18nContext'
import { useAuth } from '../lib/AuthContext'
import { useGroups, useWatchlistStatus, useSpoilerFree, useShowData, useEpisodeTracking, useGroupWatch, useResumePosition } from '../hooks'

import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ShowHeader from '../components/show-detail/ShowHeader'
import GroupWatchPanel from '../components/show-detail/GroupWatchPanel'
import MediaGrid from '../components/show-detail/MediaGrid'
import SeasonSection from '../components/show-detail/SeasonSection'
import CatchUpModal from '../components/show-detail/CatchUpModal'
import ConfirmSeasonModal from '../components/show-detail/ConfirmSeasonModal'
import CollectionGrid from '../components/show-detail/CollectionGrid'
import EmotionPicker from '../components/EmotionPicker'
import ShowToasts from '../components/show-detail/ShowToasts'

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { user } = useAuth()

  const data = useShowData(id, user?.uid)
  const {
    show, rating, loading, isMovie, tmdbOverview, year, genres, status, movieRuntime,
    watchedCounts, resumePositions, emotions, setEmotions, similar, recommended,
    collection, collectionParts, mergedEpisodes, grouped, watchedCountsBySeason,
    avgRuntime, remainingDuration, totalEpsCount, remainingCount, simAdded, simAdding,
  } = data

  const resume = useResumePosition(user?.uid, show, data.setResumePositions)

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const tracking = useEpisodeTracking({
    uid: user?.uid,
    id,
    show,
    isMovie,
    watchedCounts,
    setWatchedCounts: data.setWatchedCounts,
    mergedEpisodes,
    grouped,
    selectedGroupId,
  })
  const {
    catchUpPrompt, confirmSeason, emotionPickerFor, toggling, markingSeason,
    expandedSynopsis, feedbackEp, episodeToast, seasonToast, seriesToast, movieToast,
    movieToggling, batchProgress,
  } = tracking

  const { groups } = useGroups(user?.uid)
  const group = useGroupWatch({
    id,
    uid: user?.uid,
    show,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    watchedCountsRef: tracking.watchedCountsRef,
    setWatchedCounts: data.setWatchedCounts,
    mergedEpisodes,
    grouped,
  })
  const {
    groupMembers, groupWatchFeed, groupWatchToast,
    showsInGroups, setShowsInGroups, sortByProgress, setSortByProgress,
    memberSeasonProgress, memberColorMap,
  } = group

  const { inWatchlist, loading: wlLoading, setInWatchlist } = useWatchlistStatus(user?.uid, show?.tmdb_id)
  const [spoilerFree] = useSpoilerFree()

  const [watchlistToast, setWatchlistToast] = useState<{ added: boolean } | null>(null)
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<number>>(new Set())
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('compactMode') === 'true')
  const handleCompactToggle = useCallback(() => {
    setCompactMode(prev => { const next = !prev; localStorage.setItem('compactMode', String(next)); return next })
  }, [])

  const [collapsePref, setCollapsePref] = useState(() => localStorage.getItem('collapsePreference') || 'first')

  useEffect(() => {
    const handleStorageChange = () => {
      setCollapsePref(localStorage.getItem('collapsePreference') || 'first')
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const hasTmdbData = data.tmdbEpisodes.length > 0

  useEffect(() => {
    if (!hasTmdbData || loading) return
    const seasons = Object.keys(grouped).map(Number).sort((a, b) => a - b)
    const fullyWatched = seasons.filter(s => (watchedCountsBySeason[s] || 0) === (grouped[s]?.length || 0))
    const allWatched = fullyWatched.length === seasons.length
    const collapsed = new Set(fullyWatched)
    if (allWatched && seasons.length > 0) {
      const keep = collapsePref === 'last' ? seasons[seasons.length - 1] : seasons[0]
      collapsed.delete(keep)
    }
    setCollapsedSeasons(collapsed)
  }, [hasTmdbData, loading, grouped, watchedCountsBySeason, collapsePref])

  const handleToggleSeason = useCallback((seasonNum: number) => {
    setCollapsedSeasons(prev => {
      const next = new Set(prev)
      if (next.has(seasonNum)) next.delete(seasonNum)
      else next.add(seasonNum)
      return next
    })
  }, [])

  const allSeasonNums = useMemo(() => Object.keys(grouped).map(Number).sort((a, b) => a - b), [grouped])
  const allCollapsed = allSeasonNums.length > 0 && allSeasonNums.every(s => collapsedSeasons.has(s))

  const handleCollapseAll = useCallback(() => {
    setCollapsedSeasons(new Set(allSeasonNums))
  }, [allSeasonNums])

  const handleExpandAll = useCallback(() => {
    setCollapsedSeasons(new Set())
  }, [])

  const movieWatched = !!(isMovie && show && (watchedCounts.get(show.tmdb_id) ?? 0) > 0)

  return loading ? <Loading text={t.showDetail.loading} /> : (
    <>{!show ? (
      <EmptyState title={t.showDetail.notFound}><button onClick={() => navigate(-1)} className="underline font-bold">{t.showDetail.back}</button></EmptyState>
    ) : (
    <div className="space-y-8">
      <ShowHeader
        show={show}
        isMovie={isMovie}
        year={year}
        genres={genres}
        status={status}
        movieRuntime={movieRuntime}
        avgRuntime={avgRuntime}
        tmdbOverview={tmdbOverview}
        spoilerFree={spoilerFree}
        user={user}
        rating={rating}
        setRating={data.setRating}
        inWatchlist={inWatchlist}
        wlLoading={wlLoading}
        setInWatchlist={setInWatchlist}
        setWatchlistToast={setWatchlistToast}
        userLists={data.userLists}
        showInLists={data.showInLists}
        setShowInLists={data.setShowInLists}
        movieWatched={movieWatched}
        movieToggling={movieToggling}
        handleMovieToggle={tracking.handleMovieToggle}
        resume={resume}
        resumePositions={resumePositions}
        providers={data.providers}
        streamCountry={data.streamCountry}
        handleStreamCountryChange={data.handleStreamCountryChange}
        t={t}
        lang={lang}
      />
      <GroupWatchPanel
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        uid={user?.uid}
        show={show}
        showsInGroups={showsInGroups}
        setShowsInGroups={setShowsInGroups}
        groupMembers={groupMembers}
        groupWatchFeed={groupWatchFeed}
        mergedEpisodes={mergedEpisodes}
        t={t}
      />
      {!isMovie && hasTmdbData && remainingCount > 0 && (
        <div className="bg-surface border-[3px] border-border p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase">{t.showDetail.remaining}</span>
            <span className="text-xs font-bold">{remainingCount} / {totalEpsCount}{remainingDuration && <span className="font-normal text-text-secondary ml-2">({remainingDuration})</span>}</span>
          </div>
          <div className="h-3 bg-surface-light border-2 border-border overflow-hidden">
            <div className="h-full bg-yellow progress-shimmer transition-all duration-500 ease-out" style={{ width: `${totalEpsCount ? ((totalEpsCount - remainingCount) / totalEpsCount) * 100 : 0}%` }} />
          </div>
        </div>
      )}
      {!isMovie && hasTmdbData && remainingCount === 0 && (
        <div className="bg-surface border-[3px] border-border p-3 text-xs font-bold text-center bg-green/30">{t.showDetail.allCaughtUp}</div>
      )}
      {isMovie && collection ? (
        <CollectionGrid collection={collection} parts={collectionParts} excludeId={show?.tmdb_id} t={t} />
      ) : (
        <>
          {allSeasonNums.length > 1 && (
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCompactToggle}
                className={`border-2 border-border px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer ${compactMode ? 'bg-yellow text-text' : 'bg-surface sm:hover:bg-yellow'}`}
                aria-label={t.showDetail.compactMode}
              >
                {t.showDetail.compactMode} {compactMode ? t.settings.on : t.settings.off}
              </button>
              <button
                onClick={allCollapsed ? handleExpandAll : handleCollapseAll}
                className="border-2 border-border px-2 py-1 text-[10px] font-bold uppercase bg-surface sm:hover:bg-yellow transition-colors cursor-pointer"
                aria-label={allCollapsed ? t.showDetail.expandAll : t.showDetail.collapseAll}
              >
                {allCollapsed ? t.showDetail.expandAll : t.showDetail.collapseAll}
              </button>
            </div>
          )}
          {Object.entries(grouped).map(([season, eps]) => {
          const seasonNum = Number(season)
          const watchedCount = watchedCountsBySeason[seasonNum] || 0
          const allWatched = watchedCount === eps.length
          return (
            <SeasonSection
              key={season}
              season={season}
              eps={eps}
              seasonNum={seasonNum}
              watchedCount={watchedCount}
              allWatched={allWatched}
              hasTmdbData={hasTmdbData}
              collapsed={collapsedSeasons.has(seasonNum)}
              watchedCounts={watchedCounts}
              toggling={toggling}
              expandedSynopsis={expandedSynopsis}
              emotions={emotions}
              resumePositions={resumePositions}
              editingPosition={resume.editingPosition}
              editValue={resume.editValue}
              setEditValue={resume.setEditValue}
              editInputRef={resume.editInputRef}
              selectedGroupId={selectedGroupId}
              groupMembers={groupMembers}
              groupProgress={group.groupProgress}
              memberSeasonProgress={memberSeasonProgress}
              memberColorMap={memberColorMap}
              sortByProgress={sortByProgress}
              markingSeason={markingSeason}
              spoilerFree={spoilerFree}
              avgRuntime={avgRuntime}
              userUid={user?.uid ?? ''}
              compactMode={compactMode}
              t={t}
              onToggleSeason={handleToggleSeason}
              onMarkSeasonWatched={tracking.handleMarkSeasonWatched}
              onMarkSeasonUnwatched={tracking.handleMarkSeasonUnwatched}
              onToggle={tracking.handleToggle}
              onRewatch={tracking.handleRewatch}
              onToggleSynopsis={tracking.handleToggleSynopsis}
              onResumeClick={resume.handleResumeClick}
              onResumeSave={resume.handleResumeSave}
              onResumePreset={resume.handlePresetPosition}
              onResumeClear={resume.handleClearPosition}
              onResumeKeyDown={resume.handleResumeKeyDown}
              onSortByProgressToggle={(n) => setSortByProgress(prev => { const s = new Set(prev); if (s.has(n)) s.delete(n); else s.add(n); return s })}
            />
          )
        })}
        </>
      )}
      <MediaGrid
        items={similar}
        isMovie={isMovie}
        label={t.showDetail.similar}
        expanded={data.showSimilar}
        onToggle={() => data.setShowSimilar(prev => !prev)}
        onAdd={data.handleSimilarAdd}
        onWatch={data.handleSimilarWatch}
        adding={simAdding}
        added={simAdded}
        t={t}
      />
      <MediaGrid
        items={recommended}
        isMovie={isMovie}
        label={t.showDetail.recommendations}
        expanded={data.showRecommended}
        onToggle={() => data.setShowRecommended(prev => !prev)}
        onAdd={data.handleSimilarAdd}
        onWatch={data.handleSimilarWatch}
        adding={simAdding}
        added={simAdded}
        t={t}
      />
      {catchUpPrompt && (
        <CatchUpModal
          data={catchUpPrompt}
          onCatchUp={tracking.handleCatchUp}
          onClose={() => tracking.setCatchUpPrompt(null)}
          t={t}
          isProcessing={toggling !== null}
        />
      )}
      {confirmSeason && (
        <ConfirmSeasonModal
          data={confirmSeason}
          onConfirm={tracking.handleConfirmSeason}
          onCancel={tracking.handleCancelSeason}
          t={t}
          isProcessing={markingSeason !== null}
        />
      )}
      {emotionPickerFor && user?.uid && (
        <EmotionPicker
          uid={user.uid}
          episodeId={emotionPickerFor}
          currentEmotion={emotions.get(emotionPickerFor) ?? null}
          onSelect={(emotionId) => {
            setEmotions(prev => { const next = new Map(prev); if (emotionId) next.set(emotionPickerFor, emotionId); else next.delete(emotionPickerFor); return next })
          }}
          onClose={() => tracking.setEmotionPickerFor(null)}
          t={t}
        />
      )}
      <ShowToasts
        batchProgress={batchProgress}
        watchlistToast={watchlistToast}
        episodeToast={episodeToast}
        movieToast={movieToast}
        seasonToast={seasonToast}
        groupWatchToast={groupWatchToast}
        seriesToast={seriesToast}
        feedbackEp={feedbackEp}
        showName={show?.name ?? null}
        uid={user?.uid ?? ''}
        mergedEpisodes={mergedEpisodes}
        currentEmotion={seriesToast !== null ? emotions.get(seriesToast) ?? null : null}
        onEmotionSelect={(emotionId) => {
          if (seriesToast === null) return
          setEmotions(prev => { const n = new Map(prev); if (emotionId) n.set(seriesToast, emotionId); else n.delete(seriesToast); return n })
        }}
        onSeriesToastClose={() => tracking.setSeriesToast(null)}
        t={t}
      />
    </div>
    )}
    </>
  )
}
