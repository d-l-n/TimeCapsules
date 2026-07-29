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
import ConfirmDialog from '../components/ConfirmDialog'

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
              <h2 className="text-xl font-heading uppercase">{getListDisplayName(list, lang)}</h2>
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
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t.lists.delete}
        message={t.lists.confirmDelete}
        confirmLabel={t.lists.delete}
        confirmAction={() => { setShowDeleteConfirm(false); handleDelete() }}
        cancelLabel={t.lists.cancel}
        variant="danger"
      />
      <ConfirmDialog
        open={showEmptyConfirm}
        onClose={() => setShowEmptyConfirm(false)}
        title={t.lists.emptyListBtn}
        message={t.lists.confirmEmpty}
        confirmLabel={t.lists.emptyListBtn}
        confirmAction={() => { setShowEmptyConfirm(false); handleEmpty() }}
        cancelLabel={t.lists.cancel}
        variant="danger"
      />
    </div>
  )
}
