import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLists } from '../hooks'
import { useI18n } from '../lib/I18nContext'
import { createList, getListDisplayName } from '../services/listService'
import { isDefaultList } from '../lib/firebase-queries'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'

type Filter = 'all' | 'collections'

const FILTERS: { key: Filter; labelKey: 'all' | 'collections' }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'collections', labelKey: 'collections' },
]

const FILTER_LABELS: Record<'all' | 'collections', { en: string; es: string }> = {
  all: { en: 'ALL', es: 'TODO' },
  collections: { en: 'COLLECTIONS', es: 'COLECCIONES' },
}

export default function ListsPage() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const { lists, loading, refresh } = useLists(user?.uid)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const { defaults, customs } = useMemo(() => {
    const d: typeof lists = []
    const c: typeof lists = []
    lists.forEach(l => (isDefaultList(l.id) ? d : c).push(l))
    return { defaults: d, customs: c }
  }, [lists])

  const visibleLists = useMemo(() => {
    const all = [...defaults, ...customs]
    if (filter === 'all') return all
    if (filter === 'collections') return customs
    return all
  }, [defaults, customs, filter])

  const handleCreate = async () => {
    if (!user?.uid || !name.trim()) return
    await createList(user.uid, name.trim(), desc.trim())
    setName(''); setDesc(''); setCreating(false)
    refresh()
  }

  if (loading) return <Loading text={t.lists.loading} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b-[3px] border-border pb-4">
        <h2 className="text-2xl sm:text-4xl font-black uppercase font-heading">{t.lists.myLists}</h2>
        <button onClick={() => setCreating(true)} aria-label={t.lists.newList} className="btn-brutal btn-accent">{t.lists.newList}</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`border-[3px] border-border px-4 py-2 font-bold text-xs uppercase transition-all shadow-brutal-xs ${filter === f.key ? 'bg-yellow text-text' : 'bg-surface text-text sm:hover:bg-yellow'}`}
            aria-pressed={filter === f.key}
          >
            {FILTER_LABELS[f.labelKey][lang === 'es' ? 'es' : 'en']}
          </button>
        ))}
      </div>

      {creating && (
        <div className="bg-surface border-[3px] border-border p-4 space-y-3 shadow-brutal-md">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.lists.namePlaceholder} className="w-full border-[3px] border-border bg-bg px-3 py-2 text-sm font-bold outline-none focus:bg-yellow/30" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.lists.descPlaceholder} className="w-full border-[3px] border-border bg-bg px-3 py-2 text-sm outline-none focus:bg-yellow/30" />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!name.trim()} aria-label={t.lists.create} className="btn-brutal btn-accent text-xs">{t.lists.create}</button>
            <button onClick={() => setCreating(false)} aria-label={t.lists.cancel} className="btn-brutal bg-surface text-xs">{t.lists.cancel}</button>
          </div>
        </div>
      )}

      {visibleLists.length === 0 && !creating ? (
        <EmptyState title={t.lists.noLists} description={t.lists.noListsDesc} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleLists.map(list => (
            <Link key={list.id} to={`/lists/${list.id}`} className="group bg-surface border-[3px] border-border px-4 py-4 shadow-brutal sm:hover:-translate-x-1 sm:hover:-translate-y-1 sm:hover:shadow-brutal-lg transition-all">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-black uppercase text-base truncate">{getListDisplayName(list, lang)}</h3>
                  {list.description && <p className="text-text-secondary text-xs mt-1 line-clamp-2">{list.description}</p>}
                </div>
                <span className="text-[10px] font-bold text-text-secondary border-2 border-border bg-surface-light px-1.5 py-0.5 shrink-0 ml-2">{list.show_ids.length} {t.lists.shows}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
