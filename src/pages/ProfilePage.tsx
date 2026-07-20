import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { updateProfile, updateEmail, deleteUser } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { useTheme, ACCENT_PRESETS, type AccentKey } from '../lib/ThemeContext'
import { useSpoilerFree } from '../hooks'
import { saveUserProfile } from '../services/groupService'

import HistoryTimeline from './HistoryTimeline'
import CalendarPage from './CalendarPage'
import StatsPage from './StatsPage'
import ListsPage from './ListsPage'
import ErrorBox from '../components/ErrorBox'

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth()
  const { theme, setTheme, accent, setAccent } = useTheme()
  const { t, lang, setLang } = useI18n()

  const dangerBtn = `w-full border-[3px] border-border py-2 text-xs font-bold uppercase transition-colors cursor-pointer ${
    theme === 'dark'
      ? 'bg-[#f5f0eb] text-[#0a0a0a] hover:bg-yellow hover:text-text'
      : 'bg-[#0a0a0a] text-[#f5f0eb] hover:bg-yellow hover:text-text'
  }`
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const section = searchParams.get('section') || 'account'
  const historyView = searchParams.get('view') || sessionStorage.getItem('profileHistoryView') || 'timeline'

  useEffect(() => {
    sessionStorage.setItem('profileHistoryView', historyView)
  }, [historyView])

  // Profile forms
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Confirmations
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false)
  const [cacheMessage, setCacheMessage] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleClearCache = () => {
    const cacheKeys: string[] = [
      'streamCountry',
      'collapsePreference',
      'lastNotifCheck',
      'discover_search_query',
      'discover_search_results',
      'discover_search_searched',
    ]
    // Remove all tmdb_mt_* keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('tmdb_mt_')) {
        cacheKeys.push(key)
      }
    }
    // Remove timecapsules-install-* keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('timecapsules-install-')) {
        cacheKeys.push(key)
      }
    }
    cacheKeys.forEach(k => localStorage.removeItem(k))
    setCacheMessage(t.profile.clearCacheDone)
    setTimeout(() => setCacheMessage(null), 3000)
    setShowClearCacheConfirm(false)
  }
  const [spoilerFree, setSpoilerFree] = useSpoilerFree()
  const [hideEmail, setHideEmail] = useState(() => localStorage.getItem('hideEmail') === '1')

  const handleHideEmail = (val: boolean) => {
    localStorage.setItem('hideEmail', val ? '1' : '0')
    setHideEmail(val)
  }
  const [collapsePref, setCollapsePref] = useState(() => localStorage.getItem('collapsePreference') || 'first')

  const handleCollapsePref = (val: string) => {
    localStorage.setItem('collapsePreference', val)
    setCollapsePref(val)
  }

  // Sync inputs with user if user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setPhotoURL(user.photoURL || '')
      setEmail(user.email || '')
    }
  }, [user])

  if (!user) {
    return null
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) return

    setSaving(true)
    setMessage(null)

    try {
      // 1. Update Display Name and Photo URL
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null,
      })

      // 2. Sync display name to Firestore for group member visibility
      await saveUserProfile(user.uid, displayName.trim(), photoURL.trim())

      // 3. Update Email if it has changed
      if (email.trim() && email.trim() !== user.email) {
        await updateEmail(auth.currentUser, email.trim())
      }

      // 4. Reload to refresh user.photoURL/displayName in AuthContext
      await refreshUser()
      setMessage({ type: 'success', text: t.profile.success })
    } catch (err: any) {
      console.error(err)
      let errMsg = t.profile.error
      if (err.code === 'auth/requires-recent-login') {
        errMsg = lang === 'es' 
          ? 'Por seguridad, necesitas volver a iniciar sesión para cambiar tu correo.'
          : 'For security, you must log in again to change your email.'
      }
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return
    try {
      await deleteUser(auth.currentUser)
      navigate('/login')
    } catch (err: any) {
      console.error(err)
      const errMsg = lang === 'es'
        ? 'Error al eliminar la cuenta. Si es una cuenta registrada, por seguridad debes iniciar sesión de nuevo antes de eliminarla.'
        : 'Error deleting account. For security reasons, you must log in again before deleting your account.'
      setDeleteError(errMsg)
    }
  }

  const accentKeys = Object.keys(ACCENT_PRESETS) as AccentKey[]

  const initial = (user.displayName || user.email?.split('@')[0] || 'U').charAt(0).toUpperCase()

  const setSection = (s: string) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    next.set('section', s)
    return next
  })

  const sections = [
    { key: 'account', label: t.profile.accountTab },
    { key: 'settings', label: t.profile.settingsTab },
    { key: 'history', label: t.profile.historyTab },
    { key: 'stats', label: t.profile.statsTab },
    { key: 'lists', label: t.profile.listsTab },
  ]

  return (
    <div className="space-y-8">
      {/* Profile hero */}
      <ProfileHero
        user={user}
        initial={initial}
        hideEmail={hideEmail}
      />

      {/* Ribbon nav */}
      <nav className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-none" aria-label={t.profile.sections}>
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            aria-current={section === s.key}
            className={`flex-shrink-0 snap-start whitespace-nowrap border-[3px] border-border px-4 py-2.5 text-xs font-bold uppercase transition-colors cursor-pointer ${
              section === s.key ? 'bg-yellow text-text border-text' : 'bg-surface text-text hover:bg-yellow hover:border-text'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Section content */}
      <div className="space-y-6">
          {section === 'account' && (
            <div className="space-y-8 bg-surface border-[3px] border-border p-4 lg:p-6 shadow-brutal">
              {message && (
                <div
                  role={message.type === 'error' ? 'alert' : undefined}
                  className={`border-[3px] border-border p-3 text-xs font-bold uppercase ${message.type === 'success' ? 'bg-yellow/30' : 'bg-pink/10 text-pink'}`}
                >
                  {message.text}
                </div>
              )}
              <ProfileForm
                displayName={displayName}
                setDisplayName={setDisplayName}
                photoURL={photoURL}
                setPhotoURL={setPhotoURL}
                email={email}
                setEmail={setEmail}
                saving={saving}
                onSubmit={handleSaveProfile}
                t={t}
              />
              <SettingsBlock title={t.profile.session} bordered>
                  <div className="space-y-3">
                  <button
                    onClick={() => setShowSignOutConfirm(true)}
                    aria-label={t.auth.signOut}
                    className="w-full border-[3px] border-border bg-surface text-text py-2 text-xs font-bold uppercase hover:bg-pink hover:text-text transition-colors cursor-pointer"
                  >
                    {t.auth.signOut}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label={t.profile.deleteAccount}
                    className={dangerBtn}
                  >
                    {t.profile.deleteAccount}
                  </button>
                </div>
              </SettingsBlock>
            </div>
          )}

          {section === 'settings' && (
            <div className="space-y-8 bg-surface border-[3px] border-border p-4 lg:p-6 shadow-brutal">
              <SettingsBlock title={t.settings.appearance}>
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Row label={t.settings.theme} />
                    <p className="text-[11px] text-text-secondary leading-tight">{t.settings.themeDesc}</p>
                    <div className="flex gap-2 w-full">
                      <TogglePill active={theme === 'light'} onClick={() => setTheme('light')} label={t.settings.light}><re-icon icon="sun" className="w-6 h-6"></re-icon></TogglePill>
                      <TogglePill active={theme === 'dark'} onClick={() => setTheme('dark')} label={t.settings.dark}><re-icon icon="moon"></re-icon></TogglePill>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Row label={t.settings.accentColor} />
                    <p className="text-[11px] text-text-secondary leading-tight">{t.settings.accentColorDesc}</p>
                    <div className="flex gap-2 flex-wrap">
                      {accentKeys.map((key) => (
                        <button
                          key={key}
                          onClick={() => setAccent(key)}
                          className={`w-7 h-7 border-2 transition-all cursor-pointer ${
                            accent === key ? 'border-border scale-110 ring-2 ring-yellow ring-offset-2 ring-offset-surface' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ backgroundColor: ACCENT_PRESETS[key] }}
                          aria-label={t.settings[key as keyof typeof t.settings] as string}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <Row label={t.settings.spoilerFree} />
                      <p className="text-[11px] text-text-secondary leading-tight">{t.settings.spoilerFreeDesc}</p>
                      <TogglePill
                        active={spoilerFree}
                        onClick={() => setSpoilerFree(!spoilerFree)}
                        label={spoilerFree ? t.settings.on : t.settings.off}
                      >
                        {spoilerFree ? t.settings.on : t.settings.off}
                      </TogglePill>
                    </div>
                    <div className="space-y-1.5">
                      <Row label={t.settings.collapsePref} />
                      <p className="text-[11px] text-text-secondary leading-tight">{t.settings.collapsePrefDesc}</p>
                      <div className="flex gap-2">
                        <TogglePill active={collapsePref === 'first'} onClick={() => handleCollapsePref('first')} label={t.settings.collapseFirst}>{t.settings.collapseFirst}</TogglePill>
                        <TogglePill active={collapsePref === 'last'} onClick={() => handleCollapsePref('last')} label={t.settings.collapseLast}>{t.settings.collapseLast}</TogglePill>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Row label={t.settings.hideEmail} />
                      <p className="text-[11px] text-text-secondary leading-tight">{t.settings.hideEmailDesc}</p>
                      <TogglePill
                        active={hideEmail}
                        onClick={() => handleHideEmail(!hideEmail)}
                        label={hideEmail ? t.settings.on : t.settings.off}
                      >
                        {hideEmail ? t.settings.on : t.settings.off}
                      </TogglePill>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Row label={t.settings.language} />
                    <p className="text-[11px] text-text-secondary leading-tight">{t.settings.languageDesc}</p>
                    <div className="flex gap-2">
                      <TogglePill active={lang === 'en'} onClick={() => setLang('en')} label={t.settings.english}>{t.settings.english}</TogglePill>
                      <TogglePill active={lang === 'es'} onClick={() => setLang('es')} label={t.settings.spanish}>{t.settings.spanish}</TogglePill>
                    </div>
                  </div>
                </div>
              </SettingsBlock>

              <SettingsBlock title={t.profile.clearCache} bordered>
                <p className="text-[10px] text-text-secondary leading-tight mb-3">{t.profile.clearCacheDesc}</p>
                {cacheMessage && (
                  <div className="border-[3px] border-border bg-yellow/30 px-3 py-2 text-[10px] font-bold uppercase mb-3">{cacheMessage}</div>
                )}
                <button
                  onClick={() => setShowClearCacheConfirm(true)}
                  aria-label={t.profile.clearCache}
                  className="w-full border-[3px] border-border bg-surface text-text py-2 text-xs font-bold uppercase hover:bg-yellow transition-colors cursor-pointer"
                >
                  {t.profile.clearCache}
                </button>
              </SettingsBlock>
            </div>
          )}

          {section === 'history' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <TogglePill
                  active={historyView === 'timeline'}
                  borderWidth="border-[3px]"
                  onClick={() => {
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('view', 'timeline')
                    setSearchParams(nextParams)
                  }}
                  label={t.profile.viewTimeline}
                >
                  {t.profile.viewTimeline}
                </TogglePill>
                <TogglePill
                  active={historyView === 'calendar'}
                  borderWidth="border-[3px]"
                  onClick={() => {
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('view', 'calendar')
                    setSearchParams(nextParams)
                  }}
                  label={t.profile.viewCalendar}
                >
                  {t.profile.viewCalendar}
                </TogglePill>
              </div>

              {historyView === 'calendar' ? <CalendarPage /> : <HistoryTimeline />}
            </div>
          )}

          {section === 'stats' && <StatsPage />}
          {section === 'lists' && <ListsPage />}
        </div>

      {/* Confirmation Modals */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === 'Escape' && setShowSignOutConfirm(false)}>
          <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-4 p-6 shadow-brutal-xl space-y-6">
            <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-3 font-heading">
              {t.auth.signOut}
            </h3>
            <p className="text-sm font-bold">
              {t.profile.signOutConfirm}
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setShowSignOutConfirm(false)
                  await logout()
                  navigate('/login')
                }}
                aria-label="Confirm sign out"
                className="flex-1 border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase hover:bg-orange hover:text-text transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'SÍ, CERRAR SESIÓN' : 'YES, SIGN OUT'}
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                aria-label="Cancel"
                className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase hover:bg-yellow transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'CANCELAR' : 'CANCEL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === 'Escape' && (setShowDeleteConfirm(false), setDeleteError(null))}>
          <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-4 p-6 shadow-brutal-xl space-y-6">
            <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-3 font-heading">
              {t.profile.deleteAccount}
            </h3>
            <p className="text-sm font-bold text-pink">
              {t.profile.deleteConfirm}
            </p>
            {deleteError && (
              <ErrorBox message={deleteError} />
            )}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setDeleteError(null)
                  await handleDeleteAccount()
                }}
                aria-label="Confirm delete"
                className="flex-1 border-[3px] border-border bg-pink text-text px-4 py-3 text-sm font-bold uppercase hover:bg-text hover:text-pink transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'ELIMINAR' : 'DELETE'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                aria-label="Cancel"
                className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase hover:bg-yellow transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'CANCELAR' : 'CANCEL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearCacheConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80" role="dialog" aria-modal="true" onKeyDown={(e) => e.key === 'Escape' && setShowClearCacheConfirm(false)}>
          <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-4 p-6 shadow-brutal-xl space-y-6">
            <h3 className="text-lg font-bold uppercase border-b-4 border-border pb-3 font-heading">
              {t.profile.clearCache}
            </h3>
            <p className="text-sm font-bold">
              {t.profile.clearCacheConfirm}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearCache}
                aria-label={t.profile.clearCache}
                className="flex-1 border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase hover:bg-orange transition-colors cursor-pointer"
              >
                {lang === 'es' ? 'LIMPIAR' : 'CLEAR'}
              </button>
              <button
                onClick={() => setShowClearCacheConfirm(false)}
                aria-label="Cancel"
                className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase hover:bg-yellow transition-colors cursor-pointer"
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

/* ── Profile subcomponents ───────────────────────────── */

function ProfileHero({ user, initial, hideEmail }: {
  user: ReturnType<typeof useAuth>['user']
  initial: string
  hideEmail: boolean
}) {
  return (
    <div className="bg-surface border-[3px] border-border shadow-brutal p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5 animate-fade-in-up">
      <div className="shrink-0">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-20 h-20 sm:w-24 sm:h-24 border-[3px] border-border object-cover bg-yellow" />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-yellow border-[3px] border-border flex items-center justify-center text-3xl sm:text-4xl font-bold text-text">
            {initial}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{hideEmail ? 'PROFILE' : (user?.email?.split('@')[1] ?? '').toUpperCase() || 'PROFILE'}</div>
        <h1 className="text-2xl sm:text-3xl font-bold uppercase truncate font-heading leading-none">{(user?.displayName || (!hideEmail && user?.email?.split('@')[0])) ?? 'User'}</h1>
        {!hideEmail && user?.email && <div className="text-xs sm:text-sm text-text-secondary mt-1.5 truncate">{user.email}</div>}
      </div>
    </div>
  )
}

function TogglePill({ active, onClick, label, children, borderWidth = 'border-2' }: {
  active: boolean
  onClick: () => void
  label: string
  children?: React.ReactNode
  borderWidth?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center gap-1 px-2.5 whitespace-nowrap shrink-0 ${borderWidth} border-border py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer ${
        active ? 'bg-yellow text-text border-text' : 'bg-surface text-text hover:bg-yellow'
      }`}
    >
      {children ?? label}
    </button>
  )
}

function Row({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase text-text-secondary">{label}</span>
      {children}
    </div>
  )
}

function SettingsBlock({ title, bordered, children }: { title: string; bordered?: boolean; children: React.ReactNode }) {
  return (
    <section className={`space-y-4 ${bordered ? 'pt-4 border-t-4 border-border' : ''}`}>
      <h3 className="text-sm font-bold uppercase text-text-secondary">{title}</h3>
      {children}
    </section>
  )
}

function ProfileForm({ displayName, setDisplayName, photoURL, setPhotoURL, email, setEmail, saving, onSubmit, t }: {
  displayName: string
  setDisplayName: (v: string) => void
  photoURL: string
  setPhotoURL: (v: string) => void
  email: string
  setEmail: (v: string) => void
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  t: ReturnType<typeof useI18n>['t']
}) {
  const inputCls = 'w-full border-2 border-border bg-surface px-3 py-2 text-xs font-bold outline-none focus:bg-yellow/30 transition-colors'
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold uppercase border-b-4 border-border pb-2 font-heading">{t.profile.settings}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-displayname" className="text-xs font-bold uppercase text-text-secondary">{t.profile.displayName}</label>
          <input id="profile-displayname" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-photourl" className="text-xs font-bold uppercase text-text-secondary">{t.profile.photoUrl}</label>
          <input id="profile-photourl" type="url" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://example.com/avatar.jpg" className={inputCls} />
          {photoURL.trim() && (
            <div className="flex items-center gap-2 mt-1">
              <img src={photoURL.trim()} alt="" className="w-8 h-8 border-2 border-border object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <span className="text-[10px] text-text-secondary">Preview</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-email" className="text-xs font-bold uppercase text-text-secondary">{t.profile.email}</label>
          <input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="johndoe@example.com" className={inputCls} />
        </div>
        <button type="submit" disabled={saving} aria-label={t.profile.save} className="w-full border-[3px] border-border bg-yellow text-text px-4 py-2.5 text-xs font-bold uppercase hover:bg-pink transition-colors cursor-pointer disabled:opacity-50">
          {saving ? t.profile.saving : t.profile.save}
        </button>
      </form>
    </section>
  )
}


