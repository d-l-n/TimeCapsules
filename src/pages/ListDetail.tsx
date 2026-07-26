import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { getList, deleteList, updateList, removeShowFromList, emptyList, getListDisplayName } from '../services/listService'
import { getShowById } from '../services/showService'
import { getPosterUrl } from '../services/tmdb'
import { isDefaultList } from '../lib/firebase-queries'
import type { CustomListDoc } from '../lib/firebase-queries'
import type { ShowDoc } from '../lib/firebase-queries'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ShowCard from '../components/ShowCard'

export default function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [list, setList] = useState<CustomListDoc | null>(null)
  const [shows, setShows] = useState<ShowDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)

  useEffect(() => {
    if (!id) return
    getList(id).then(async l => {
      if (!l) { setLoading(false); return }
      setList(l); setName(l.name); setDesc(l.description)
      const showData = await Promise.all(l.show_ids.map(sid => getShowById(sid)))
      setShows(showData.filter(Boolean) as ShowDoc[])
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    await deleteList(id)
    window.location.href = '/lists'
  }

  const handleSave = async () => {
    if (!id) return
    await updateList(id, { name, description: desc })
    setEditing(false)
    setList(prev => prev ? { ...prev, name, description: desc } : prev)
  }

  const handleRemove = async (showId: number) => {
    if (!id) return
    await removeShowFromList(id, showId)
    setShows(prev => prev.filter(s => s.tmdb_id !== showId))
    setList(prev => prev ? { ...prev, show_ids: prev.show_ids.filter(s => s !== showId) } : prev)
  }

  const handleEmpty = async () => {
    if (!id) return
    await emptyList(id)
    setShows([])
    setList(prev => prev ? { ...prev, show_ids: [] } : prev)
  }

  if (loading) return <Loading text={t.lists.loading} />
  if (!list) return <EmptyState title={t.lists.notFound} />
  const isOwner = user?.uid === list.user_id
  const isDefault = isDefaultList(list.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-4 border-border pb-3">
        <div>
          {editing ? (
            <div className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} className="border-2 border-border bg-bg px-2 py-1 text-sm font-bold w-full" />
              <input value={desc} onChange={e => setDesc(e.target.value)} className="border-2 border-border bg-bg px-2 py-1 text-sm w-full" />
              <div className="flex gap-2">
                <button onClick={handleSave} aria-label={t.lists.save} className="bg-yellow border-2 border-border px-2 py-0.5 text-xs font-bold uppercase cursor-pointer">{t.lists.save}</button>
                <button onClick={() => setEditing(false)} aria-label={t.lists.cancel} className="border-2 border-border px-2 py-0.5 text-xs font-bold uppercase cursor-pointer">{t.lists.cancel}</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold uppercase" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>{getListDisplayName(list, lang)}</h2>
              {list.description && <p className="text-text-secondary text-sm mt-1">{list.description}</p>}
              <p className="text-xs font-bold text-text-secondary mt-1">{list.show_ids.length} {t.lists.shows}</p>
            </>
          )}
        </div>
        {isOwner && !editing && (
          <div className="flex gap-2">
            {isDefault ? (
              <span className="border-2 border-border px-2 py-1 text-xs font-bold uppercase text-text-secondary">{t.lists.defaultList}</span>
            ) : (
              <>
                <button onClick={() => setEditing(true)} aria-label={t.lists.edit} className="border-2 border-border px-2 py-1 text-xs font-bold uppercase cursor-pointer sm:hover:bg-yellow transition-colors">{t.lists.edit}</button>
                <button onClick={() => setShowDeleteConfirm(true)} aria-label={t.lists.delete} className="border-2 border-border px-2 py-1 text-xs font-bold uppercase cursor-pointer text-pink sm:hover:bg-pink sm:hover:text-text transition-colors">{t.lists.delete}</button>
              </>
            )}
            {shows.length > 0 && (
              <button onClick={() => setShowEmptyConfirm(true)} aria-label={t.lists.emptyListBtn} className="border-2 border-border px-2 py-1 text-xs font-bold uppercase cursor-pointer sm:hover:bg-pink sm:hover:text-text transition-colors">{t.lists.emptyListBtn}</button>
            )}
          </div>
        )}
      </div>
      {shows.length === 0 ? (
        <EmptyState title={t.lists.emptyList} description={t.lists.emptyListDesc} />
      ) : (
        <div className="max-sm:grid max-sm:grid-flow-col max-sm:auto-cols-[9rem] max-sm:overflow-x-auto max-sm:gap-3 max-sm:snap-x max-sm:pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 sm:gap-3">
          {shows.map(show => (
            <ShowCard
              key={show.tmdb_id}
              id={show.tmdb_id}
              name={show.name}
              posterUrl={show.poster_url ? getPosterUrl(show.poster_url)! : null}
              mediaType={show.media_type}
              onRemove={isOwner ? () => handleRemove(show.tmdb_id) : undefined}
            />
          ))}
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === 'Escape' && setShowDeleteConfirm(false)}>
          <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-4 p-6 shadow-brutal-xl space-y-6">
            <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-3 font-heading">
              {t.lists.delete}
            </h3>
            <p className="text-sm font-bold">
              {t.lists.confirmDelete}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); handleDelete() }}
                aria-label="Confirm delete"
                className="flex-1 border-[3px] border-border bg-pink text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-text sm:hover:text-pink transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'ELIMINAR' : 'DELETE'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Cancel"
                className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-yellow transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'CANCELAR' : 'CANCEL'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === 'Escape' && setShowEmptyConfirm(false)}>
          <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-4 p-6 shadow-brutal-xl space-y-6">
            <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-3 font-heading">
              {t.lists.emptyListBtn}
            </h3>
            <p className="text-sm font-bold">
              {t.lists.confirmEmpty}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEmptyConfirm(false); handleEmpty() }}
                aria-label="Confirm empty"
                className="flex-1 border-[3px] border-border bg-pink text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-text sm:hover:text-pink transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'VACIAR' : 'EMPTY'}
              </button>
              <button
                onClick={() => setShowEmptyConfirm(false)}
                aria-label="Cancel"
                className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-yellow transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'CANCELAR' : 'CANCEL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
