import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useHistory } from '../hooks'
import { useI18n } from '../lib/I18nContext'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'

export default function CalendarPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { entries, loading } = useHistory(user?.uid)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const watchedMap = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const e of entries) {
      const key = e.watched_at.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [entries])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  const dayEntries = selectedDate ? (watchedMap.get(selectedDate) || []) : []
  const monthCount = entries.filter(e => e.watched_at?.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)).length

  if (loading) return <Loading text={t.calendar.loading} />

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-surface border-[3px] border-border p-4">
        <button onClick={prevMonth} className="border-[3px] border-border px-3 py-2 text-sm font-bold bg-surface text-text hover:bg-yellow transition-colors" aria-label={t.calendar.prevMonth}>&larr;</button>
        <div className="text-center">
          <div className="text-lg font-bold uppercase" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }} id="calendar-heading">
            {t.calendar.months[viewMonth]} {viewYear}
          </div>
          <div className="text-xs font-bold text-text-secondary mt-1" aria-live="polite">{monthCount} {t.calendar.episodesWatched}</div>
        </div>
        <button onClick={nextMonth} className="border-[3px] border-border px-3 py-2 text-sm font-bold bg-surface text-text hover:bg-yellow transition-colors" aria-label={t.calendar.nextMonth}>&rarr;</button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1" role="grid" aria-labelledby="calendar-heading">
        {t.calendar.weekdays.map(d => (
          <div key={d} className="text-center text-[10px] sm:text-xs font-bold uppercase text-text-secondary py-2 border-b-4 border-border" role="columnheader">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasEntries = watchedMap.has(dateStr)
          const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`aspect-square border-2 transition-all flex flex-col items-center justify-center text-[11px] sm:text-sm font-bold ${isSelected ? 'bg-text text-bg border-border' : isToday ? 'bg-yellow text-text border-border' : hasEntries ? 'bg-surface text-text border-border hover:bg-yellow' : 'bg-surface text-text-secondary border-transparent hover:border-border'}`}
              aria-label={`${t.calendar.months[viewMonth]} ${day}, ${viewYear}${hasEntries ? ` — ${watchedMap.get(dateStr)!.length} ${t.calendar.episodesWatched}` : ''}${isToday ? ` — ${t.calendar.today}` : ''}`}
            >
              <span>{day}</span>
              {hasEntries && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-pink mt-0.5" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div aria-live="polite">
          <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-2 mb-4">
            {selectedDate} <span className="ml-2 border-2 border-border px-2 py-0.5 text-sm">{dayEntries.length}</span>
          </h3>
          {dayEntries.length === 0 && <p className="text-sm text-text-secondary">{t.calendar.noData}</p>}
          <div className="space-y-2">
            {dayEntries.map(entry => (
              <Link key={entry.id} to={`/show/${entry.show_id}`} className="flex items-center gap-2 sm:gap-3 bg-surface border-[3px] border-border px-3 sm:px-4 py-2.5 sm:py-3 hover:translate-x-0.5 hover:-translate-y-0.5 hover-shadow-[8px_8px_0_#111] transition-all" aria-label={`${entry.show_name} ${t.showDetail.season} ${entry.season_number} ${t.showDetail.episode} ${entry.episode_number}`}>
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow border-2 border-border flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0" aria-hidden="true">{entry.episode_number}</div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs sm:text-sm uppercase truncate block">{entry.show_name}</span>
                  <span className="text-text-secondary text-[10px] sm:text-xs">S{entry.season_number} &middot; E{entry.episode_number}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!selectedDate && entries.length === 0 && (
        <EmptyState title={t.calendar.noData} />
      )}
    </div>
  )
}
