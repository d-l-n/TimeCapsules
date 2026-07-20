import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { fmtTime } from '../lib/formatting'

interface DashboardHeroProps {
  streak: number
  episodesWatched: number
  showsTracked: number
  timeSpent: number
}

export default function DashboardHero({ streak, episodesWatched, showsTracked, timeSpent }: DashboardHeroProps) {
  const { t } = useI18n()
  const { user } = useAuth()

  const name = user?.displayName || user?.email?.split('@')[0] || 'Tracker'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t.dashboard.goodMorning : hour < 19 ? t.dashboard.goodAfternoon : t.dashboard.goodEvening

  return (
    <div className="bg-surface border-[3px] border-border shadow-brutal p-5 sm:p-7 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{t.dashboard.overview}</div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase leading-none font-heading">
            {greeting}, <span className="text-orange">{name}</span>
          </h1>
        </div>
        <Link
          to="/discover"
          className="btn-brutal btn-accent shrink-0"
        >
          {t.dashboard.goDiscover}
          <re-icon icon="arrow-right" decorative></re-icon>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {streak > 1 && (
          <StatLink to="/stats" value={`${streak}`} label={t.dashboard.dayStreak} tone="highlight" />
        )}
        <StatLink to="/profile?section=history" value={episodesWatched.toLocaleString()} label={t.dashboard.totalWatched} />
        <div className="bg-surface-light border-[3px] border-border p-4 sm:p-5">
          <div className="text-3xl sm:text-5xl font-black mb-1 font-heading leading-none">{showsTracked}</div>
          <div className="text-[10px] sm:text-xs font-bold uppercase text-text-secondary">{t.dashboard.showsTracked}</div>
        </div>
        <StatLink to="/profile?section=stats" value={fmtTime(timeSpent, t)} label={t.dashboard.timeSpent} />
      </div>
    </div>
  )
}

function StatLink({ to, value, label, tone }: { to: string; value: string; label: string; tone?: 'highlight' }) {
  return (
    <Link
      to={to}
      className={`group bg-surface-light border-[3px] border-border p-4 sm:p-5 relative overflow-hidden transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md ${tone === 'highlight' ? 'hover:bg-pink/30' : ''}`}
    >
      <div className="text-3xl sm:text-5xl font-black mb-1 font-heading leading-none">{value}</div>
      <div className="text-[10px] sm:text-xs font-bold uppercase text-text-secondary">{label}</div>
    </Link>
  )
}
