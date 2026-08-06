import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RatingPicker from './RatingPicker'
import PositionEditor from './PositionEditor'
import StreamProviders from './StreamProviders'
import { TimerIcon } from '../Icons'
import { fmtPos } from './types'
import { addToWatchlist, removeFromWatchlist } from '../../services/watchlistService'
import { addShowToList, removeShowFromList, getListDisplayName } from '../../services/listService'
import { playWatchSound, playUnwatchSound } from '../../lib/sound'
import type { useI18n } from '../../lib/I18nContext'
import type { useResumePosition } from '../../hooks/useResumePosition'
import type { ShowDoc, RatingDoc, CustomListDoc } from '../../lib/firebase-queries'
import type { WatchProvidersResult } from '../../services/tmdb'

interface ShowHeaderProps {
  show: ShowDoc
  isMovie: boolean
  year: string | null
  genres: { id: number; name: string }[]
  status: string | null
  movieRuntime: number | null
  avgRuntime: number
  tmdbOverview: string | null
  spoilerFree: boolean
  user: { uid: string } | null
  rating: RatingDoc | null
  setRating: React.Dispatch<React.SetStateAction<RatingDoc | null>>
  inWatchlist: boolean
  wlLoading: boolean
  setInWatchlist: (v: boolean) => void
  setWatchlistToast: React.Dispatch<React.SetStateAction<{ added: boolean } | null>>
  userLists: CustomListDoc[]
  showInLists: Set<string>
  setShowInLists: React.Dispatch<React.SetStateAction<Set<string>>>
  movieWatched: boolean
  movieToggling: boolean
  handleMovieToggle: () => void
  resume: ReturnType<typeof useResumePosition>
  resumePositions: Map<number, number>
  providers: WatchProvidersResult | null
  streamCountry: string
  handleStreamCountryChange: (country: string) => void
  t: ReturnType<typeof useI18n>['t']
  lang: ReturnType<typeof useI18n>['lang']
}

export default function ShowHeader({
  show, isMovie, year, genres, status, movieRuntime, avgRuntime, tmdbOverview,
  spoilerFree, user, rating, setRating,
  inWatchlist, wlLoading, setInWatchlist, setWatchlistToast,
  userLists, showInLists, setShowInLists,
  movieWatched, movieToggling, handleMovieToggle,
  resume, resumePositions, providers, streamCountry, handleStreamCountryChange,
  t, lang,
}: ShowHeaderProps) {
  const navigate = useNavigate()
  const [showRatingPicker, setShowRatingPicker] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [listToggling, setListToggling] = useState<Set<string>>(new Set())
  const [wlToggling, setWlToggling] = useState(false)
  const backdrop = show?.backdrop_url ?? null

  const handleWatchlistToggle = async () => {
    if (wlToggling || !user?.uid || !show?.tmdb_id) return
    setWlToggling(true)
    try {
      const adding = !inWatchlist
      if (inWatchlist) { await removeFromWatchlist(user.uid, show.tmdb_id); setInWatchlist(false); playUnwatchSound() }
      else { await addToWatchlist(user.uid, show.tmdb_id); setInWatchlist(true); playWatchSound() }
      setWatchlistToast({ added: adding })
      setTimeout(() => setWatchlistToast(null), 3000)
    } catch (e) { console.warn('showDetail action failed', e) }
    setWlToggling(false)
  }

  return (
    <>
      {backdrop && (
        <div className="relative h-48 sm:h-64 overflow-hidden sm:border-[3px] sm:border-border -mx-4 sm:-mx-0">
          <img src={backdrop} alt="" aria-hidden="true" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-bg to-transparent" />
        </div>
      )}
      <div className="relative -mt-12 sm:-mt-24 mx-4 sm:mx-0 p-4 sm:p-6 bg-surface border-[3px] border-border shadow-brutal space-y-3 sm:space-y-4 z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button onClick={() => navigate(-1)} className="btn-brutal text-xs sm:text-sm" aria-label={`${t.showDetail.back}`}>&larr; {t.showDetail.back}</button>
          {user?.uid && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowRatingPicker(prev => !prev)}
                className="btn-brutal text-xs sm:text-sm w-full sm:w-auto"
                aria-label={t.showDetail.yourRating}
              >
                {t.showDetail.yourRating}: <span className="text-pink">{rating?.rating ?? '?'}/10</span>
              </button>
              {showRatingPicker && (
                <RatingPicker
                  rating={rating}
                  showTmdbId={show.tmdb_id}
                  userUid={user.uid}
                  setRating={setRating}
                  onClose={() => setShowRatingPicker(false)}
                  t={t}
                />
              )}
            </div>
          )}
        </div>
        <div className="border-b-[3px] border-border pb-4 sm:pb-5 mb-1 space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-yellow">{isMovie ? t.discover.movie : t.discover.tv}</span>
            {year && <span className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-surface">{year}</span>}
            {genres.slice(0, 3).map(g => (
              <button
                key={g.id}
                onClick={() => {
                  sessionStorage.setItem('discover_search_query', g.name)
                  sessionStorage.setItem('discover_search_searched', 'true')
                  navigate('/discover')
                }}
                className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-surface sm:hover:bg-yellow transition-colors cursor-pointer"
                aria-label={t.showDetail.filterBy.replace('{name}', g.name)}
              >
                {g.name}
              </button>
            ))}
            {(isMovie ? movieRuntime : avgRuntime > 0) && (
              <span className="border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase bg-surface">
                {isMovie ? `${movieRuntime}m` : `${avgRuntime}m`}
              </span>
            )}
            {!isMovie && status && (
              <span className={`border-2 border-border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase ${
                status === 'Returning Series' || status === 'In Production' ? 'bg-green/30' :
                status === 'Canceled' ? 'bg-red/30' : 'bg-surface'
              }`}>
                {status === 'Returning Series' ? t.showDetail.statusReturning :
                 status === 'Ended' ? t.showDetail.statusEnded :
                 status === 'Canceled' ? t.showDetail.statusCanceled :
                 status === 'In Production' ? t.showDetail.statusInProduction :
                 status === 'Planned' ? t.showDetail.statusPlanned :
                 status === 'Pilot' ? t.showDetail.statusPilot :
                 status}
              </span>
            )}
            {!spoilerFree && show.imdb_rating != null && (
              <div className="border-[3px] border-border px-1.5 sm:px-2 py-1 sm:py-1.5 bg-surface font-bold text-[9px] sm:text-xs shadow-brutal-xs">{t.showDetail.imdb}: <span className="text-pink">{show.imdb_rating}</span>{show.imdb_votes != null && <span className="font-normal text-text-secondary ml-1">({show.imdb_votes.toLocaleString()} {t.showDetail.votes})</span>}</div>
            )}
          </div>
          <h1 className="text-xl sm:text-4xl md:text-5xl font-black uppercase leading-tight break-words font-heading">{show.name}</h1>
          {(tmdbOverview ?? show.synopsis) && <p className="text-xs sm:text-sm leading-relaxed max-w-3xl">{tmdbOverview ?? show.synopsis}</p>}
        </div>
        <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
          {!wlLoading && user?.uid && show?.tmdb_id && (
            <button
              onClick={handleWatchlistToggle}
              disabled={wlToggling}
              className={`btn-brutal text-xs sm:text-sm ${wlToggling ? 'bg-yellow/50 text-text/50 cursor-wait' : inWatchlist ? 'bg-yellow cursor-pointer' : 'bg-surface cursor-pointer'}`}
              aria-label={inWatchlist ? t.watchlist.removeAction : t.watchlist.addAction}
            >
              {wlToggling ? '…' : inWatchlist ? t.watchlist.added : t.watchlist.add}
            </button>
          )}
          {user?.uid && show?.tmdb_id && (
            <div className="relative">
              <button onClick={() => setShowListPicker(prev => !prev)} className="btn-brutal text-xs sm:text-sm">{t.lists.addToList}</button>
              {showListPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowListPicker(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-surface border-[3px] border-border z-20 min-w-48 max-h-60 overflow-y-auto shadow-brutal-md">
                  {userLists.length === 0 && <div className="px-3 py-2 text-xs text-text-secondary">{t.lists.noLists}</div>}
                      {userLists.map(list => {
                    const inList = showInLists.has(list.id)
                    const isToggling = listToggling.has(list.id)
                    return (
                      <button
                        key={list.id}
                        onClick={async () => {
                          if (isToggling) return
                          setListToggling(prev => new Set(prev).add(list.id))
                          try {
                            if (inList) { await removeShowFromList(list.id, show.tmdb_id); setShowInLists(prev => { const n = new Set(prev); n.delete(list.id); return n }) }
                            else { await addShowToList(list.id, show.tmdb_id); setShowInLists(prev => { const n = new Set(prev); n.add(list.id); return n }) }
                          } catch (e) { console.warn('showDetail action failed', e) }
                          setListToggling(prev => { const n = new Set(prev); n.delete(list.id); return n })
                        }}
                        disabled={isToggling}
                        className={`w-full text-left px-3 py-2 text-xs font-bold border-b-2 border-border last:border-b-0 transition-colors ${isToggling ? 'bg-surface/50 text-text/50 cursor-wait' : inList ? 'bg-yellow text-text sm:hover:bg-yellow cursor-pointer' : 'bg-surface text-text sm:hover:bg-yellow cursor-pointer'}`}
                        aria-label={(inList ? t.lists.removeFromListAria : t.lists.addToListAria).replace('{name}', getListDisplayName(list, lang))}
                      >
                        {isToggling ? '…' : `${getListDisplayName(list, lang)} ${inList ? t.common.ok : ''}`}
                      </button>
                    )
                  })}
                </div>
                </>
              )}
            </div>
          )}
          {isMovie && (
            <>
              <button
                onClick={handleMovieToggle}
                disabled={movieToggling}
                className={`btn-brutal text-xs sm:text-sm transition-all duration-300 ease-out ${movieToggling ? 'bg-yellow/50 text-text/50 cursor-wait' : movieWatched ? 'bg-yellow cursor-pointer' : 'bg-surface cursor-pointer'}`}
                aria-label={movieWatched ? t.showDetail.watched : t.showDetail.markAsWatched}
              >
                {movieToggling ? '…' : movieWatched ? t.showDetail.watched : t.showDetail.markAsWatched}
              </button>
              {resume.editingPosition === show.tmdb_id ? (
                <PositionEditor
                  contentId={show.tmdb_id}
                  contentType="movie"
                  maxSeconds={movieRuntime ? movieRuntime * 60 : 7200}
                  editValue={resume.editValue}
                  setEditValue={resume.setEditValue}
                  editInputRef={resume.editInputRef}
                  currentSeconds={resumePositions.get(show.tmdb_id)}
                  onSave={resume.handleResumeSave}
                  onPreset={resume.handlePresetPosition}
                  onClear={resume.handleClearPosition}
                  onKeyDown={resume.handleResumeKeyDown}
                  t={t}
                />
              ) : (
                <button
                  onClick={() => resume.handleResumeClick(show.tmdb_id, resumePositions.get(show.tmdb_id))}
                  className="btn-brutal text-xs sm:text-sm"
                  aria-label={t.showDetail.resumePosition}
                >
                  <TimerIcon className="w-3.5 h-3.5" />
                  {resumePositions.has(show.tmdb_id) ? fmtPos(resumePositions.get(show.tmdb_id)!) : t.showDetail.noPosition}
                </button>
              )}
            </>
          )}
        </div>
        {providers && (
          <StreamProviders
            providers={providers}
            streamCountry={streamCountry}
            onCountryChange={handleStreamCountryChange}
            showName={show?.name || ''}
            t={t}
          />
        )}
      </div>
    </>
  )
}
