import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { useStats } from '../hooks'
import { fmtTime } from '../lib/formatting'

import Loading from '../components/Loading'
import { triggerConfetti } from '../lib/confetti'

const KPI_COLORS = ['bg-yellow', 'bg-blue', 'bg-green', 'bg-pink', 'bg-orange', 'bg-purple', 'bg-red']

export default function StatsPage() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const { stats, ratingDist, showCount, badges, streak, loading, BADGE_NAMES } = useStats(user?.uid)

  useEffect(() => {
    if (!loading && badges.length > 0) {
      const timer = setTimeout(() => {
        triggerConfetti()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, badges.length])

  const maxCount = ratingDist.length > 0 ? Math.max(...ratingDist.map(r => r.count)) : 0

  const kpis = [
    { label: t.stats.episodesWatched, value: stats.nb_episodes_watched ?? 0 },
    { label: t.stats.showsFollowed, value: showCount },
    { label: t.stats.timeSpent, value: fmtTime(stats.time_spent ?? 0, t) },
    ...(streak > 1 ? [{ label: t.stats.streak, value: `${streak}` }] : []),
    { label: t.stats.avgRating, value: ratingDist.length ? (ratingDist.reduce((s, r) => s + r.rating * r.count, 0) / ratingDist.reduce((s, r) => s + r.count, 0)).toFixed(1) : '—' },
  ]

  return loading ? <Loading text={t.stats.loading} /> : (
    <div className="space-y-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className={`${KPI_COLORS[i % KPI_COLORS.length]} border-[3px] border-border p-3 sm:p-5 shadow-brutal flex flex-col justify-between min-h-[90px] sm:min-h-[120px]`} role="figure" aria-label={`${kpi.label}: ${kpi.value}`}>
            <div className="text-3xl sm:text-6xl font-black leading-none font-heading break-words">{kpi.value}</div>
            <div className="text-[9px] sm:text-xs font-bold uppercase mt-2 sm:mt-3">{kpi.label}</div>
          </div>
        ))}
      </div>

      {ratingDist.length > 0 && (
        <section aria-label={t.stats.ratingDistribution} className="bg-surface border-[3px] border-border p-5 shadow-brutal">
          <h3 className="text-xl sm:text-2xl font-black uppercase border-b-[3px] border-border pb-3 mb-5 font-heading">{t.stats.ratingDistribution}</h3>
          <div className="space-y-3">
            {ratingDist.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-bold w-8 text-right border-2 border-border px-1 py-1 bg-surface-light">{rating}</span>
                <div className="flex-1 h-6 sm:h-8 bg-surface-light border-2 border-border" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={maxCount} aria-label={`${rating} stars: ${count} ratings`}>
                  <div className="h-full bg-purple border-r-2 border-border transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="text-sm font-bold w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {badges.length > 0 && (
        <section aria-label={t.stats.badges} className="bg-surface border-[3px] border-border p-5 shadow-brutal">
          <h3 className="text-xl sm:text-2xl font-black uppercase border-b-[3px] border-border pb-3 mb-5 font-heading">{t.stats.badges}<span className="ml-2 border-2 border-border bg-yellow px-2 py-0.5 text-sm">{badges.length}</span></h3>
          <div className="flex flex-wrap gap-3">
            {badges.map(badge => (
              <div key={badge.badge_id} className="bg-surface-light border-[3px] border-border px-4 py-3 text-center min-w-[100px] sm:min-w-[120px] flex-1 sm:flex-none sm:hover:-translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-brutal-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all" role="img" aria-label={`${t.stats.badgeLabel} ${BADGE_NAMES[parseInt(badge.badge_id)] || `${t.stats.badgeFallback} #${badge.badge_id}`}${badge.earned_at ? `, ${t.stats.earned} ${new Date(badge.earned_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}` : ''}`}>
                <div className="text-3xl mb-1" aria-hidden="true">◆</div>
                <div className="text-xs font-bold uppercase">{BADGE_NAMES[parseInt(badge.badge_id)] || `${t.stats.badgeFallback} #${badge.badge_id}`}</div>
                {badge.earned_at && <div className="text-[10px] text-text-secondary mt-1 border-t-2 border-border pt-1">{new Date(badge.earned_at).toLocaleDateString()}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
