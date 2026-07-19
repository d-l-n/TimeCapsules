import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLists } from '../hooks'
import { useI18n } from '../lib/I18nContext'
import { createList } from '../services/listService'
import { isDefaultList } from '../lib/firebase-queries'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'

export default function ListsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { lists, loading, refresh } = useLists(user?.uid)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const { defaults, customs } = useMemo(() => {
    const d: typeof lists = []
    const c: typeof lists = []
    lists.forEach(l => (isDefaultList(l.id) ? d : c).push(l))
    return { defaults: d, customs: c }
  }, [lists])

  const handleCreate = async () => {
    if (!user?.uid || !name.trim()) return
    await createList(user.uid, name.trim(), desc.trim())
    setName(''); setDesc(''); setCreating(false)
    refresh()
  }

  if (loading) return <Loading text={t.lists.loading} />
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-4 border-border pb-3">
        <h2 className="text-xl sm:text-2xl font-bold uppercase" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>{t.lists.myLists}</h2>
        <button onClick={() => setCreating(true)} aria-label={t.lists.newList} className="bg-accent text-text border-4 border-border px-3 py-1.5 font-bold text-xs uppercase cursor-pointer hover:bg-highlight transition-colors">{t.lists.newList}</button>
      </div>
      {creating && (
        <div className="bg-surface border-4 border-border p-4 space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.lists.namePlaceholder} className="w-full border-2 border-border bg-bg px-2 py-1.5 text-sm font-bold" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.lists.descPlaceholder} className="w-full border-2 border-border bg-bg px-2 py-1.5 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!name.trim()} aria-label={t.lists.create} className="bg-accent border-2 border-border px-3 py-1 font-bold text-xs uppercase cursor-pointer disabled:opacity-50">{t.lists.create}</button>
            <button onClick={() => setCreating(false)} aria-label={t.lists.cancel} className="border-2 border-border px-3 py-1 font-bold text-xs uppercase cursor-pointer">{t.lists.cancel}</button>
          </div>
        </div>
      )}
      {defaults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-text-secondary">{t.lists.defaultList}</h3>
          {defaults.map(list => (
            <Link key={list.id} to={`/lists/${list.id}`} className="block bg-surface border-4 border-border px-4 py-3 hover:translate-x-0.5 hover:-translate-y-0.5 hover-shadow-brutal transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold uppercase text-sm">{list.name}</h3>
                  {list.description && <p className="text-text-secondary text-xs mt-0.5">{list.description}</p>}
                </div>
                <span className="text-[10px] font-bold text-text-secondary border-2 border-border px-1.5 py-0.5">{list.show_ids.length} {t.lists.shows}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {customs.length === 0 && !creating ? (
        <EmptyState title={t.lists.noLists} description={t.lists.noListsDesc} />
      ) : (
        <div className="space-y-3">
          {customs.map(list => (
            <Link key={list.id} to={`/lists/${list.id}`} className="block bg-surface border-4 border-border px-4 py-3 hover:translate-x-0.5 hover:-translate-y-0.5 hover-shadow-brutal transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold uppercase text-sm">{list.name}</h3>
                  {list.description && <p className="text-text-secondary text-xs mt-0.5">{list.description}</p>}
                </div>
                <span className="text-[10px] font-bold text-text-secondary border-2 border-border px-1.5 py-0.5">{list.show_ids.length} {t.lists.shows}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
