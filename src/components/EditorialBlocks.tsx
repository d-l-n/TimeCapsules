import { Link } from 'react-router-dom'
import { useI18n } from '../lib/I18nContext'

interface EditorialBlocksProps {
  streak: number
  finishedCount: number
  upToDateCount: number
  episodesWatched: number
  todayCount: number
}

export default function EditorialBlocks({ streak, finishedCount, upToDateCount, episodesWatched, todayCount }: EditorialBlocksProps) {
  const { t } = useI18n()
  const quotes = t.dashboard.quotes
  const quote = quotes[Math.abs(episodesWatched) % quotes.length]
  const goal = 3
  const progress = Math.min(todayCount / goal, 1)
  const isComplete = todayCount >= goal
  const remaining = goal - todayCount

  return (
    <section aria-label={t.dashboard.highlights} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Link
        to="/profile?section=history"
        className="block bg-surface border-[3px] border-border p-5 shadow-brutal lg:col-span-2 group sm:hover:-translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-brutal-md transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text/70">{t.dashboard.weeklyChallenge}</div>
          {isComplete && (
            <span className="text-[10px] font-black uppercase bg-yellow text-text px-1.5 py-0.5">{t.dashboard.dailyCompleteBadge}</span>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-black uppercase font-heading leading-tight">{t.dashboard.weeklyChallengeGoal}</div>

        <div className="mt-4" role="progressbar" aria-valuenow={todayCount} aria-valuemin={0} aria-valuemax={goal}>
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="uppercase tracking-wider text-text/80">
              {t.dashboard.dailyProgress
                .replace('{today}', String(todayCount))
                .replace('{goal}', String(goal))}
            </span>
            <span className={`${isComplete ? 'text-text font-black' : 'text-text/70'}`}>
              {isComplete ? '✓' : remaining > 0
                ? (remaining === 1
                  ? t.dashboard.dailyRemaining.replace('{remaining}', String(remaining))
                  : t.dashboard.dailyRemainingPlural.replace('{remaining}', String(remaining)))
                : ''
              }
            </span>
          </div>
          <div className="h-3 bg-text/15 border-[3px] border-border relative overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out ${isComplete ? 'bg-text' : 'bg-text/80'}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <div className="text-sm font-bold mt-3 flex items-center gap-2">
          <span className="text-text/70">{t.dashboard.streakLabel}</span>
          <span className="bg-text text-bg px-2 py-0.5">{streak > 1 ? t.dashboard.streakDays.replace('{streak}', String(streak)) : t.dashboard.streakStart}</span>
          <span className="text-[9px] uppercase tracking-wider ml-auto opacity-60 sm:group-hover:opacity-100 transition-opacity">{t.dashboard.viewHistory} →</span>
        </div>
      </Link>
      <div className="bg-surface border-[3px] border-border p-5 shadow-brutal">
        <div className="text-[10px] font-bold uppercase tracking-widest text-text/70 mb-2">{t.dashboard.achievement}</div>
        <div className="text-4xl mb-1 text-yellow">◆</div>
        <div className="text-sm font-black uppercase">{finishedCount > 0 ? t.dashboard.collector : t.dashboard.newcomer}</div>
        <div className="text-xs font-bold mt-1 text-text-secondary">{t.dashboard.achievementCount.replace('{finished}', String(finishedCount)).replace('{upToDate}', String(upToDateCount))}</div>
      </div>
      <div className="bg-surface border-[3px] border-border p-5 shadow-brutal lg:col-span-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-text/70 mb-2">{t.dashboard.quoteOfTheDay}</div>
        <div className="text-xl sm:text-2xl font-black uppercase font-heading leading-tight text-text">"{quote}"</div>
      </div>
    </section>
  )
}
