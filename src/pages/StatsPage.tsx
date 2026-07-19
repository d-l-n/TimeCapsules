import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { useStats } from '../hooks'
import { fmtTime } from '../lib/formatting'
import Loading from '../components/Loading'
import { triggerConfetti } from '../lib/confetti'

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

  if (loading) return <Loading text={t.stats.loading} />

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t.stats.episodesWatched} value={stats.nb_episodes_watched ?? 0} />
        <StatCard label={t.stats.showsFollowed} value={showCount} />
        <StatCard label={t.stats.totalShows} value={showCount} />
        <StatCard label={t.stats.timeSpent} value={fmtTime(stats.time_spent ?? 0, t)} />
        {streak > 1 && <StatCard label={t.stats.streak} value={`${streak}`} />}
      </div>
      {ratingDist.length > 0 && (
        <section aria-label={t.stats.ratingDistribution}>
          <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4">{t.stats.ratingDistribution}</h3>
          <div className="space-y-2">
            {ratingDist.map(({ rating, count }) => {
              const maxCount = Math.max(...ratingDist.map(r => r.count))
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-sm font-bold w-6 text-right border-2 border-border px-1 py-0.5">{rating}</span>
                  <div className="flex-1 h-7 bg-surface border-2 border-border" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={maxCount} aria-label={`${rating} stars: ${count} ratings`}>
                    <div className="h-full bg-accent border-r-2 border-border transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold w-10 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
      {badges.length > 0 && (
        <section aria-label={t.stats.badges}>
          <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4">{t.stats.badges}<span className="ml-2 border-2 border-border px-2 py-0.5 text-sm">{badges.length}</span></h3>
          <div className="flex flex-wrap gap-3">
            {badges.map(badge => (
              <div key={badge.badge_id} className="bg-surface border-4 border-border px-4 py-3 text-center min-w-[120px] hover:translate-x-0.5 hover:-translate-y-0.5 hover-shadow-brutal transition-all" role="img" aria-label={`${t.stats.badgeLabel} ${BADGE_NAMES[parseInt(badge.badge_id)] || `${t.stats.badgeFallback} #${badge.badge_id}`}${badge.earned_at ? `, ${t.stats.earned} ${new Date(badge.earned_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}` : ''}`}>
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return <div className="bg-surface border-4 border-border p-3 sm:p-4 text-center hover:translate-x-0.5 hover:-translate-y-0.5 hover-shadow-brutal transition-all" role="figure" aria-label={`${label}: ${value}`}><div className="text-xl sm:text-3xl font-bold truncate" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>{value}</div><div className="text-[10px] sm:text-xs font-bold mt-1 sm:mt-2 uppercase">{label}</div></div>
}


