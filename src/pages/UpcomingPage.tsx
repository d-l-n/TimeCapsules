import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { getFollowedActiveShows } from '../services/showService'
import { getTvNextEpisode, getUpcomingMovies, getTmdbImage, getOnTheAirTv, tmdbLang } from '../services/tmdb'
import type { NextEpisodeToAir, UpcomingMovie, TmdbSearchResult } from '../services/tmdb'
import { buildShowsMap } from '../lib/firestore-utils'
import Loading from '../components/Loading'

interface FollowedShowUpcoming {
  show_id: number
  name: string
  poster_url: string | null
  tmdb_id: number | null
  next_episode: NextEpisodeToAir | null
  daysUntil: number | null
}

export default function UpcomingPage() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<'followed' | 'all'>('followed')
  const [tvUpcoming, setTvUpcoming] = useState<FollowedShowUpcoming[]>([])
  const [movieUpcoming, setMovieUpcoming] = useState<UpcomingMovie[]>([])
  const [allOnTheAir, setAllOnTheAir] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      if (mode === 'followed') {
        const showsMap = await buildShowsMap()

        const followed = await getFollowedActiveShows(user.uid)
        const withTmdb = followed.filter(f => {
          const s = showsMap.get(f.id)
          return s?.tmdb_id && s?.media_type !== 'movie'
        }).map(f => ({
          show_id: f.id,
          name: f.name,
          poster_url: f.poster_url,
          tmdb_id: showsMap.get(f.id)?.tmdb_id ?? null,
          next_episode: null as NextEpisodeToAir | null,
          daysUntil: null as number | null,
        }))

        const results = await Promise.allSettled(
          withTmdb.map(s => s.tmdb_id ? getTvNextEpisode(s.tmdb_id, tmdbLang(lang)) : Promise.resolve(null))
        )

        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const upcoming: FollowedShowUpcoming[] = []
        withTmdb.forEach((s, i) => {
          const detail = results[i].status === 'fulfilled' ? results[i].value : null
          const next = detail?.next_episode_to_air
          if (!next?.air_date) return
          const airDate = new Date(next.air_date)
          if (airDate > thirtyDaysFromNow || airDate < now) return
          const days = Math.ceil((airDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          upcoming.push({ ...s, next_episode: next, daysUntil: days })
        })

        const [movies] = await Promise.all([
          getUpcomingMovies(tmdbLang(lang)),
        ])

        if (!cancelled) {
          setTvUpcoming(upcoming.sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999)))
          setMovieUpcoming(movies)
          setAllOnTheAir([])
        }
      } else {
        const [movies, onTheAir] = await Promise.all([
          getUpcomingMovies(tmdbLang(lang)),
          getOnTheAirTv(tmdbLang(lang)),
        ])
        if (!cancelled) {
          setMovieUpcoming(movies)
          setAllOnTheAir(onTheAir)
          setTvUpcoming([])
        }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.uid, mode, lang])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b-4 border-border pb-4 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>{t.upcoming.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('followed')}
            aria-label={t.upcoming.followed}
            className={`border-[3px] border-border px-3 py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer ${mode === 'followed' ? 'bg-yellow text-text border-text' : 'bg-surface text-text sm:hover:bg-yellow'}`}
          >
            {t.upcoming.followed}
          </button>
          <button
            onClick={() => setMode('all')}
            aria-label={t.upcoming.all}
            className={`border-[3px] border-border px-3 py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer ${mode === 'all' ? 'bg-yellow text-text border-text' : 'bg-surface text-text sm:hover:bg-yellow'}`}
          >
            {t.upcoming.all}
          </button>
        </div>
      </div>

      {loading ? (
        <Loading text={t.upcoming.loading} />
      ) : (
        <div className="space-y-10">
          {mode === 'followed' && tvUpcoming.length === 0 && movieUpcoming.length === 0 && (
            <div className="border-[3px] border-border bg-surface p-8 text-center">
              <p className="text-sm font-bold">{t.upcoming.noneFollowed}</p>
            </div>
          )}

          {tvUpcoming.length > 0 && (
            <section>
              <h2 className="text-base sm:text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4">{t.upcoming.tvEpisodes} ({tvUpcoming.length})</h2>
              <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-3">
                {tvUpcoming.map(item => (
                  <Link
                    key={item.show_id}
                    to={`/show/${item.show_id}`}
                    className={`bg-surface border-2 border-border sm:hover:bg-yellow transition-colors block card-neon-${['accent', 'highlight', 'cyan', 'orange', 'purple'][Math.abs(item.show_id) % 5]}-hover`}
                  >
                    {item.poster_url ? (
                      <img src={item.poster_url} alt={item.name} className="w-full" loading="lazy" />
                    ) : (
                      <div className="aspect-[2/3] flex items-center justify-center p-4"><span className="text-xs font-bold text-center break-words">{item.name}</span></div>
                    )}
                    <div className="p-2 space-y-1 border-t-4 border-border">
                      <div className="text-xs font-bold uppercase truncate">{item.name}</div>
                      {item.next_episode && (
                        <div className="text-[10px] text-text-secondary">
                          <div>{t.upcoming.sE} {item.next_episode.season_number}x{item.next_episode.episode_number} — {item.next_episode.name}</div>
                          <div className="font-bold text-pink mt-1">
                            {item.daysUntil === 0 ? t.upcoming.today : item.daysUntil === 1 ? t.upcoming.tomorrow : `${item.daysUntil} ${t.upcoming.days}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {movieUpcoming.length > 0 && (
            <section>
              <h2 className="text-base sm:text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4">{t.upcoming.movies} ({movieUpcoming.length})</h2>
              <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-3">
                {movieUpcoming.map(m => {
                  const imgSrc = getTmdbImage(m.poster_path, 'w500')
                  const releaseDate = m.release_date ? new Date(m.release_date) : null
                  const daysUntil = releaseDate ? Math.ceil((releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                  return (
                    <Link
                      key={m.id}
                      to={`/show/-${m.id}`}
                      className={`bg-surface border-2 border-border sm:hover:bg-yellow transition-colors block card-neon-${['accent', 'highlight', 'cyan', 'orange', 'purple'][Math.abs(m.id) % 5]}-hover`}
                    >
                      {imgSrc ? (
                        <img src={imgSrc} alt={m.title} className="w-full" loading="lazy" />
                      ) : (
                        <div className="aspect-[2/3] flex items-center justify-center p-4"><span className="text-xs font-bold text-center break-words">{m.title}</span></div>
                      )}
                      <div className="p-2 space-y-1 border-t-4 border-border">
                        <div className="text-xs font-bold uppercase truncate">{m.title}</div>
                        <div className="text-[10px] text-text-secondary">
                          <div>{m.release_date || '—'}</div>
                          {daysUntil !== null && (
                            <div className="font-bold text-pink mt-1">
                              {daysUntil <= 0 ? t.upcoming.outNow : daysUntil === 1 ? t.upcoming.tomorrow : `${daysUntil} ${t.upcoming.days}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {mode === 'all' && allOnTheAir.length > 0 && (
            <section>
              <h2 className="text-base sm:text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4">{t.upcoming.onTheAir} ({allOnTheAir.length})</h2>
              <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-3">
                {allOnTheAir.map(show => {
                  const name = show.name || show.title || 'Unknown'
                  const imgSrc = getTmdbImage(show.poster_path, 'w500')
                  return (
                    <Link
                      key={show.id}
                      to={`/show/-${show.id}`}
                      className={`bg-surface border-2 border-border sm:hover:bg-yellow transition-colors block card-neon-${['accent', 'highlight', 'cyan', 'orange', 'purple'][Math.abs(show.id) % 5]}-hover`}
                    >
                      {imgSrc ? (
                        <img src={imgSrc} alt={name} className="w-full" loading="lazy" />
                      ) : (
                        <div className="aspect-[2/3] flex items-center justify-center p-4"><span className="text-xs font-bold text-center break-words">{name}</span></div>
                      )}
                      <div className="p-2 border-t-4 border-border">
                        <div className="text-xs font-bold uppercase truncate">{name}</div>
                        {(show.first_air_date || show.release_date) && (
                          <div className="text-[10px] text-text-secondary mt-1">{show.first_air_date || show.release_date}</div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
