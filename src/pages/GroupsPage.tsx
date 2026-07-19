import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { useGroups } from '../hooks'
import { joinGroupByCode, createGroup } from '../services/groupService'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'
import ErrorBox from '../components/ErrorBox'

export default function GroupsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { groups, loading, refresh } = useGroups(user?.uid)

  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!user?.uid || !createName.trim()) return
    setBusy(true)
    setError('')
    try {
      const gid = await createGroup(user.uid, createName.trim())
      setCreatedId(gid)
      setCreateName('')
      await refresh()
    } catch { setError(t.groups.error) }
    setBusy(false)
  }

  const handleJoin = async () => {
    if (!user?.uid || !joinCode.trim()) return
    setBusy(true)
    setError('')
    try {
      const gid = await joinGroupByCode(user.uid, joinCode.trim().toUpperCase())
      if (!gid) setError(t.groups.invalidCode)
      else { setJoinCode(''); await refresh() }
    } catch { setError(t.groups.error) }
    setBusy(false)
  }

  if (loading && groups.length === 0) return <Loading text={t.groups.loading} />

  return (
    <div className="space-y-8">
      <div className="bg-surface border-4 border-border shadow-brutal p-5 sm:p-7 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{t.groups.eyebrow}</div>
            <h1 className="text-2xl sm:text-3xl font-bold uppercase leading-none font-heading">{t.groups.title}</h1>
            <div className="text-xs sm:text-sm text-text-secondary mt-1.5">{groups.length} {groups.length === 1 ? t.groups.groupSingular : t.groups.groupPlural}</div>
          </div>
          <div className="border-2 border-border px-3 py-1.5 text-sm font-bold shrink-0">{groups.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface border-4 border-border p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase border-b-2 border-border pb-2">{t.groups.createGroup}</h2>
          <input
            type="text"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            placeholder={t.groups.createPlaceholder}
            className="w-full border-2 border-border bg-surface px-3 py-2 text-xs font-bold outline-none focus:bg-accent/10 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={busy || !createName.trim()}
            aria-label={t.groups.createBtn}
            className="w-full border-4 border-border bg-accent text-text px-4 py-2.5 text-xs font-bold uppercase hover:bg-highlight transition-colors disabled:opacity-40 cursor-pointer"
          >
            {busy ? '...' : t.groups.createBtn}
          </button>
        </div>

        <div className="bg-surface border-4 border-border p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase border-b-2 border-border pb-2">{t.groups.joinGroup}</h2>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t.groups.joinPlaceholder}
            maxLength={6}
            className="w-full border-2 border-border bg-surface px-3 py-2 text-xs font-bold outline-none focus:bg-accent/10 uppercase tracking-widest transition-colors"
          />
          <button
            onClick={handleJoin}
            disabled={busy || joinCode.trim().length < 4}
            aria-label={t.groups.joinBtn}
            className="w-full border-4 border-border bg-accent text-text px-4 py-2.5 text-xs font-bold uppercase hover:bg-highlight transition-colors disabled:opacity-40 cursor-pointer"
          >
            {busy ? '...' : t.groups.joinBtn}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} className="mb-4" />}
      {createdId && <div className="border-2 border-border bg-accent/10 p-3 text-xs font-bold uppercase">{t.groups.created} <Link to={`/groups/${createdId}`} className="underline">{t.groups.viewGroup}</Link></div>}

      {groups.length === 0 ? (
        <EmptyState title={t.groups.noGroups} description={t.groups.noGroupsDesc} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {groups.map(g => {
            const initial = g.name.charAt(0).toUpperCase()
            return (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="group bg-surface border-4 border-border p-4 hover:translate-x-1 hover:-translate-y-1 hover-shadow-brutal transition-all flex items-center gap-4"
              >
                <div className="w-11 h-11 shrink-0 bg-accent border-2 border-border flex items-center justify-center text-lg font-bold text-bg">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold uppercase text-sm truncate">{g.name}</div>
                  <div className="text-[10px] font-mono text-text-secondary mt-1">{t.groups.code}: <span className="border border-border px-1 bg-surface-light">{g.invite_code}</span></div>
                </div>
                <div className="border-2 border-border px-2 py-1 text-xs font-bold shrink-0 group-hover:bg-accent transition-colors">{g.member_count}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
