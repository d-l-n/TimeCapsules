import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useHistory } from '../hooks'
import { useI18n } from '../lib/I18nContext'
import { getEmotionsForHistory, getEmoji } from '../services/emotionService'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import BrutalDropdown from '../components/BrutalDropdown'

export default function HistoryTimeline() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const { entries, months, loading } = useHistory(user?.uid)
  const [selected, setSelected] = useState<string>('')
  const [emotions, setEmotions] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    if (!user?.uid) return
    getEmotionsForHistory(user.uid).then(setEmotions)
  }, [user?.uid])

  const filtered = selected ? entries.filter(e => e.watched_at?.startsWith(selected)) : entries
  const grouped = filtered.reduce<Record<string, typeof entries>>((acc, e) => {
    const d = new Date(e.watched_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[d]) acc[d] = []; acc[d].push(e); return acc
  }, {})

  if (loading) return <Loading text={t.history.loading} />
  if (entries.length === 0) return <EmptyState title={t.history.noHistory} description={t.history.noHistoryDesc} />

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-4 border-border pb-4">
        <h2 className="text-xl sm:text-2xl font-heading uppercase">{t.history.watchHistory}</h2>
        <BrutalDropdown
          value={selected}
          options={months.map(m => ({ value: m, label: m }))}
          onChange={setSelected}
          placeholder={t.history.allTime}
          ariaLabel={t.history.filterByMonth}
          buttonClassName="text-sm px-3 py-2 shadow-brutal-sm"
          className="w-full sm:w-auto"
        />
      </div>
      <div className="text-xs font-bold border-2 border-border px-3 py-1.5 inline-block bg-surface" aria-live="polite">{filtered.length} {t.history.episodes}</div>
      {filtered.length === 0 && selected ? (
        <div className="border-[3px] border-border p-6 bg-surface text-center">
          <p className="text-sm font-bold uppercase">{t.history.noHistory}</p>
          <button
            onClick={() => setSelected('')}
            className="mt-4 border-2 border-border px-3 py-1.5 text-xs font-bold bg-surface sm:hover:bg-yellow transition-colors cursor-pointer"
            aria-label={t.history.clearFilter}
          >
            {t.history.allTime}
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayEntries]) =>
        <div key={date}>
          <h3 className="text-sm font-bold uppercase mb-3 sticky top-16 bg-bg py-2 border-t-4 border-border -mx-4 px-4">{date}<span className="ml-2 border-2 border-border px-1.5 py-0.5 text-xs">{dayEntries.length}</span></h3>
          <div className="space-y-2">
            {dayEntries.map(entry => (
              <Link key={entry.id} to={`/show/${entry.show_id}`} className="flex items-center gap-2 sm:gap-3 bg-surface border-[3px] border-border px-3 sm:px-4 py-2.5 sm:py-3 sm:hover:translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-brutal active:translate-x-px active:translate-y-px active:shadow-none transition-all" aria-label={`${entry.show_name} ${t.showDetail.season} ${entry.season_number} ${t.showDetail.episode} ${entry.episode_number}`}>
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow border-2 border-border flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0" aria-hidden="true">{entry.episode_number}</div>
                <div className="flex-1 min-w-0"><span className="font-bold text-xs sm:text-sm uppercase truncate block">{entry.show_name}</span><span className="text-text-secondary text-[10px] sm:text-xs">S{entry.season_number} &middot; E{entry.episode_number}</span></div>
                {emotions.has(entry.id) && <span className="shrink-0 text-lg" title={t.emotions[emotions.get(entry.id)! as keyof typeof t.emotions] ?? emotions.get(entry.id)!}>{getEmoji(emotions.get(entry.id)!)}</span>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
