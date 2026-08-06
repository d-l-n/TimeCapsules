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
      <div className="bg-surface border-[3px] border-border shadow-brutal p-5 sm:p-7 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{t.groups.eyebrow}</div>
            <h1 className="text-2xl sm:text-3xl font-bold uppercase leading-none font-heading">{t.groups.title}</h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-2 max-w-md leading-relaxed">{t.groups.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-surface border-[3px] border-border shadow-brutal-sm p-4 sm:p-6 space-y-4 sm:hover:shadow-brutal-md transition-shadow">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 shrink-0 bg-yellow border-[3px] border-border flex items-center justify-center text-xs font-black leading-none text-text">01</span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold uppercase leading-tight">{t.groups.createGroup}</h2>
              <p className="text-[10px] font-bold uppercase text-text-secondary mt-0.5 leading-relaxed">{t.groups.createDesc}</p>
            </div>
          </div>
          <input
            type="text"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            placeholder={t.groups.createPlaceholder}
            aria-label={t.groups.createPlaceholder}
            className="w-full border-2 border-border bg-surface px-3 py-2.5 text-xs font-bold outline-none focus:bg-yellow/30 transition-colors"
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
          <button
            onClick={handleCreate}
            disabled={busy || !createName.trim()}
            aria-label={t.groups.createBtn}
            className="w-full border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-orange transition-colors disabled:opacity-40 cursor-pointer shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {busy ? '…' : t.groups.createBtn}
          </button>
        </div>

        <div className="bg-surface border-[3px] border-border shadow-brutal-sm p-4 sm:p-6 space-y-4 sm:hover:shadow-brutal-md transition-shadow">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 shrink-0 bg-surface-light border-[3px] border-border flex items-center justify-center text-xs font-black leading-none text-text">02</span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold uppercase leading-tight">{t.groups.joinGroup}</h2>
              <p className="text-[10px] font-bold uppercase text-text-secondary mt-0.5 leading-relaxed">{t.groups.joinDesc}</p>
            </div>
          </div>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t.groups.joinPlaceholder}
            aria-label={t.groups.joinPlaceholder}
            maxLength={6}
            className="w-full border-2 border-border bg-surface px-3 py-2.5 text-sm font-mono font-bold outline-none focus:bg-yellow/30 uppercase tracking-[0.3em] text-center transition-colors"
            onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
          />
          <button
            onClick={handleJoin}
            disabled={busy || joinCode.trim().length < 4}
            aria-label={t.groups.joinBtn}
            className="w-full border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-yellow transition-colors disabled:opacity-40 cursor-pointer shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {busy ? '…' : t.groups.joinBtn}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} className="mb-4" />}
      {createdId && <div className="border-2 border-border bg-yellow/30 p-3 text-xs font-bold uppercase">{t.groups.created} <Link to={`/groups/${createdId}`} className="underline">{t.groups.viewGroup}</Link></div>}

      {groups.length === 0 ? (
        <EmptyState title={t.groups.noGroups} description={t.groups.noGroupsDesc} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
          {groups.map(g => {
            const initial = g.name.charAt(0).toUpperCase()
            return (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="group bg-surface border-[3px] border-border p-4 shadow-brutal sm:hover:-translate-x-1 sm:hover:-translate-y-1 sm:hover:shadow-brutal-lg transition-all flex items-center gap-4"
              >
                <div className="w-11 h-11 shrink-0 bg-yellow border-2 border-border flex items-center justify-center text-lg font-bold text-text">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold uppercase text-sm truncate">{g.name}</div>
                  <div className="text-[10px] font-mono text-text-secondary mt-1">{t.groups.code}: <span className="border border-border px-1 bg-surface-light">{g.invite_code}</span></div>
                </div>
                <div className="border-2 border-border px-2 py-1 text-xs font-bold shrink-0 sm:group-hover:bg-yellow transition-colors">{g.member_count}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
