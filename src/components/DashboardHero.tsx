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
    <div className="bg-surface border-4 border-border shadow-brutal p-5 sm:p-7 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{t.dashboard.overview}</div>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase leading-none font-heading">
            {greeting}, <span className="text-accent">{name}</span>
          </h1>
        </div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 border-4 border-border bg-accent text-text px-4 py-2.5 text-xs font-bold uppercase hover:bg-highlight transition-colors cursor-pointer shrink-0"
        >
          {t.dashboard.goDiscover}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {streak > 1 && (
          <StatLink to="/stats" value={`${streak}`} label={t.dashboard.dayStreak} tone="highlight" />
        )}
        <StatLink to="/profile?section=history" value={episodesWatched.toLocaleString()} label={t.dashboard.totalWatched} />
        <div className="bg-surface-light border-2 border-border p-4 sm:p-5">
          <div className="text-2xl sm:text-4xl font-bold mb-1" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>{showsTracked}</div>
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
      className="group bg-surface-light border-2 border-border p-4 sm:p-5 relative overflow-hidden hover:translate-x-1 hover:-translate-y-1 hover-shadow-brutal transition-all"
    >
      {tone === 'highlight' && <div className="absolute top-0 right-0 w-16 h-16 bg-highlight/15 -translate-y-1/2 translate-x-1/2 rotate-45" />}
      <div className="text-2xl sm:text-4xl font-bold mb-1 relative" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>{value}</div>
      <div className="text-[10px] sm:text-xs font-bold uppercase text-text-secondary relative">{label}</div>
    </Link>
  )
}
