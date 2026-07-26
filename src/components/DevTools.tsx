import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme, ACCENT_PRESETS, type AccentKey } from '../lib/ThemeContext'
import { useI18n, type Lang } from '../lib/I18nContext'
import { useOnlineStatus, useSpoilerFree } from '../hooks'
import { useDevSimulation } from '../lib/dev-simulation'
import { getActiveLabels, setDevSimState, type DevSimState, type SimNotifType, type SimFirestoreError, type SimTmdbError, type SimGroupState, type SimActiveKey } from '../lib/dev-simulation-types'
import {
  CloseIcon, HexagonIcon, DiamondIcon, TargetIcon, BoltIcon, HelpIcon,
  SearchIcon, PersonIcon, GlobeIcon, ErrorIcon, GroupIcon,
  BellIcon, PackageIcon, PaletteIcon, EyeOffIcon,
  MonitorIcon, RefreshIcon, KeyboardIcon, PuzzleIcon, FlaskIcon,
} from '.'

const TABS = ['state', 'vars', 'triggers', 'scenarios', 'help'] as const
type DevTab = typeof TABS[number]

const TAB_META: Record<DevTab, { label: string; icon: React.ReactNode }> = {
  state: { label: 'State', icon: <DiamondIcon /> },
  vars: { label: 'Vars', icon: <TargetIcon /> },
  triggers: { label: 'Triggers', icon: <BoltIcon /> },
  scenarios: { label: 'Scenarios', icon: <HexagonIcon /> },
  help: { label: 'Help', icon: <HelpIcon /> },
}

interface DebugVar {
  label: string
  value: string | number | boolean | null | undefined
  note?: string
}

function getPageName(path: string): string {
  const pathLower = path.split('?')[0].replace(/\/$/, '')
  const parts = pathLower.split('/').filter(Boolean)
  if (parts.length === 0) return 'Dashboard'
  const base = parts[0]
  switch (base) {
    case 'dashboard': return 'Dashboard'
    case 'discover': return 'Discover'
    case 'show': return `Show #${parts[1] ?? '?'}`
    case 'library': return 'Library'
    case 'calendar': return 'Calendar'
    case 'upcoming': return 'Upcoming'
    case 'stats': return 'Stats'
    case 'profile': return 'Profile' + (parts[1] ? ` / ${parts[1]}` : '')
    case 'history': return 'History'
    case 'groups': return 'Groups' + (parts[1] ? ' Detail' : '')
    case 'lists': return 'Lists' + (parts[1] ? ' Detail' : '')
    default: return base.charAt(0).toUpperCase() + base.slice(1)
  }
}

const STORAGE_POS = 'tc_dev_panel_open'
const STORAGE_TAB = 'tc_dev_tab'
const SHORTCUT_KEY = 'd'

/* ── Entrance / close animation timing ── */
const CLOSE_ANIM_MS = 150
const ENTRANCE_DELAY_BASE = 30
const ENTRANCE_DELAY_STEP = 25

export default function DevTools() {
  const [open, setOpen] = useState(() => sessionStorage.getItem(STORAGE_POS) === '1')
  const [tab, setTab] = useState<DevTab>(() => {
    const stored = sessionStorage.getItem(STORAGE_TAB)
    return stored && TABS.includes(stored as DevTab) ? (stored as DevTab) : 'state'
  })
  const [tabAnimating, setTabAnimating] = useState(false)
  const { pathname, search } = useLocation()
  const { user } = useAuth()
  const { theme, accent, setTheme, setAccent } = useTheme()
  const { lang, setLang } = useI18n()
  const isOnline = useOnlineStatus()
  const [errorCount, setErrorCount] = useState(0)
  const [simOffline, setSimOffline] = useState(false)
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [entered, setEntered] = useState(false)

  const { state: sim, update: updateSim, reset: resetSim, activeKeys } = useDevSimulation()
  const [spoilerFree, toggleSpoilerFree] = useSpoilerFree()
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [varSearch, setVarSearch] = useState('')

  // Reset entrance animation on open
  useEffect(() => {
    if (open) {
      setEntered(false)
      const t = setTimeout(() => setEntered(true), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Animated tab switch
  const switchTab = useCallback((t: DevTab) => {
    if (t === tab || tabAnimating) return
    setTabAnimating(true)
    setTimeout(() => {
      setTab(t)
      setTimeout(() => setTabAnimating(false), 30)
    }, 120)
  }, [tab, tabAnimating])

  // Simulate offline by overriding navigator.onLine
  useEffect(() => {
    if (!simOffline) return
    let restore: (() => void) | null = null
    const desc = Object.getOwnPropertyDescriptor(navigator, 'onLine')
    if (desc?.configurable) {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
      window.dispatchEvent(new Event('offline'))
      restore = () => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
        window.dispatchEvent(new Event('online'))
      }
    }
    return () => { restore?.() }
  }, [simOffline])

  // Persist open state & active tab
  useEffect(() => {
    sessionStorage.setItem(STORAGE_POS, open ? '1' : '0')
  }, [open])
  useEffect(() => {
    sessionStorage.setItem(STORAGE_TAB, tab)
  }, [tab])

  const handleClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, CLOSE_ANIM_MS)
  }, [closing])

  const toggle = useCallback(() => {
    setOpen(o => {
      if (o) {
        handleClose()
        return o // keep current value, handleClose timeout will set it to false
      }
      return true
    })
  }, [handleClose])

  // Keyboard shortcut: Shift+D to toggle, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === SHORTCUT_KEY && e.shiftKey && !e.repeat) {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggle, open])

  // Focus search when switching to vars tab
  useEffect(() => {
    if (tab === 'vars') {
      searchInputRef.current?.focus()
    }
  }, [tab])

  // Click outside to close panel (desktop)
  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  const copyToClipboard = useCallback((label: string, val: string) => {
    navigator.clipboard.writeText(val)
    setCopied(label)
    setTimeout(() => setCopied(null), 1200)
  }, [])

  // Sync global dev sim state
  useEffect(() => {
    setDevSimState({
      simulateEmptyState: sim.simulateEmptyState,
      simulateHighVolume: sim.simulateHighVolume,
      simulateLatencyMs: sim.simulateLatencyMs,
      simulateFailureRate: sim.simulateFailureRate,
      firestoreError: sim.firestoreError,
      tmdbError: sim.tmdbError,
      groupState: sim.groupState,
      injectedNotifications: sim.injectedNotifications,
    })
  }, [sim])

  // SW registration tracking
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => { swRegRef.current = reg })
      const onUpdate = (e: Event) => {
        const cust = e as CustomEvent
        swRegRef.current = cust.detail?.registration ?? swRegRef.current
      }
      window.addEventListener('sw-update-available', onUpdate)
      return () => window.removeEventListener('sw-update-available', onUpdate)
    }
  }, [])

  const activeCount = activeKeys.length

  const stateVars: DebugVar[] = useMemo(() => [
    { label: 'Route', value: pathname + search },
    { label: 'User Auth', value: user ? user.uid.slice(0, 8) + '…' : 'none' },
    { label: 'Theme', value: theme },
    { label: 'Accent', value: accent },
    { label: 'Language', value: lang },
    { label: 'Online', value: isOnline },
    { label: 'SW Pending', value: !!window.__swPendingReload },
    { label: 'SW Complete', value: !!window.__swUpdateComplete },
    { label: 'Error count', value: errorCount },
  ], [pathname, search, user, theme, accent, lang, isOnline, errorCount])

  const debugVars: DebugVar[] = useMemo(() => [
    { label: 'VITE mode', value: import.meta.env.MODE },
    { label: 'VITE DEV', value: import.meta.env.DEV },
    { label: 'VITE PROD', value: import.meta.env.PROD },
    { label: 'User email', value: user?.email ?? null },
    { label: 'User ID', value: user?.uid ?? null },
    { label: 'Display name', value: user?.displayName ?? null },
    { label: 'Auth provider', value: user?.providerData.map(p => p.providerId).join(', ') ?? null },
    { label: 'User created', value: user?.metadata?.creationTime ?? null },
    { label: 'Last sign in', value: user?.metadata?.lastSignInTime ?? null },
    { label: 'Email verified', value: user?.emailVerified ?? false },
    { label: 'isAnonymous', value: user?.isAnonymous ?? false },
    { label: 'Window size', value: `${window.innerWidth}×${window.innerHeight}` },
    { label: 'User agent', value: navigator.userAgent },
  ], [user])

  const handleForceError = useCallback(() => {
    setErrorCount(n => n + 1)
    throw new Error(`[DevTools] Forced test error #${errorCount + 1}`)
  }, [errorCount])

  const handleSimulateSWUpdate = useCallback(() => {
    window.dispatchEvent(new CustomEvent('sw-update-available'))
  }, [])

  const handleClearAllCache = useCallback(() => {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }, [])

  // Filtered vars
  const filteredDebugVars = useMemo(() => {
    if (!varSearch.trim()) return debugVars
    const q = varSearch.toLowerCase()
    return debugVars.filter(v =>
      v.label.toLowerCase().includes(q) ||
      String(v.value ?? '').toLowerCase().includes(q)
    )
  }, [debugVars, varSearch])

  // Tab indicator position
  const tabIndex = TABS.indexOf(tab)
  const tabWidth = `${100 / TABS.length}%`

  return (
    <>
      {/* ── Floating trigger badge ── */}
      {!open && (
        <div
          className="fixed top-16 sm:top-4 right-4 z-[9999] group print:hidden animate-scale-in"
          style={{ animationDelay: '0ms' }}
        >
          <button
            onClick={toggle}
            className="btn-brutal bg-text text-bg hover:bg-yellow hover:text-text relative"
            aria-label="Open dev tools (Shift+D)"
            title="Open DevTools (Shift+D)"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">
                {activeCount > 0 ? (
                  <span className="inline-block animate-spin-slow"><HexagonIcon className="w-3.5 h-3.5" /></span>
                ) : (
                  <HexagonIcon className="w-3.5 h-3.5" />
                )}
              </span>
              <span>DEV</span>
            </span>
            {/* Active simulations badge */}
            {activeCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-pink text-text border-[3px] border-border text-[12px] font-bold min-w-[20px] h-[20px] flex items-center justify-center leading-none shadow-brutal-xs animate-scale-in">
                {activeCount}
              </span>
            )}
            {/* Subtle glow ring when sims active */}
            {activeCount > 0 && (
              <span className="absolute -inset-1 border-2 border-pink/40 rounded-none animate-pulse pointer-events-none" />
            )}
          </button>

          {/* Tooltip on hover — appears to the left since badge is on the right */}
          <div className="absolute right-full mr-2.5 top-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
            <div className="bg-surface text-text border-[3px] border-border shadow-brutal-sm py-2 px-3 text-[13px] font-mono leading-relaxed whitespace-nowrap">
              <div className="font-bold uppercase text-[11px] tracking-widest text-text-secondary mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-yellow" />
                Dev Tools
              </div>
              <div>
                <span className="font-bold">Page:</span>{' '}
                <span className="text-yellow">{getPageName(pathname)}</span>
              </div>
              <div><span className="font-bold">Mode:</span> {import.meta.env.MODE}</div>
              <div><span className="font-bold">UID:</span> {(user?.uid ?? '—').slice(0, 8)}</div>
              <div><span className="font-bold">Theme:</span> {theme} · <span className="font-bold">Lang:</span> {lang}</div>
              {activeCount > 0 && <div><span className="font-bold">Sims:</span> <span className="text-pink font-bold">{activeCount} active</span></div>}
              <div className="mt-1.5 pt-1.5 border-t border-border text-text-secondary">
                <kbd className="border border-border px-1.5 py-0.5 text-[11px] font-bold">Shift+D</kbd> toggle
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dev panel ── */}
      {(open || closing) && (
        <>
          {/* Overlay for mobile */}
          <div
            className={`fixed inset-0 z-[9998] bg-black/40 sm:hidden ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleClose}
          />

          <div
            ref={panelRef}
            className={`fixed top-16 sm:top-4 right-4 z-[9999] w-[min(calc(100vw-2rem),520px)] max-h-[90vh] bg-surface border-[3px] border-border shadow-brutal-xl flex flex-col overflow-hidden print:hidden ${
              closing ? 'animate-slide-out-corner' : 'animate-slide-in-corner'
            }`}
            style={{ transformOrigin: 'top right' }}
          >
            {/* ── Header with brutalist diagonal accent ── */}
            <div className="relative bg-text text-bg shrink-0 select-none overflow-hidden">
              {/* Diagonal stripe decoration */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `repeating-linear-gradient(
                    -45deg,
                    transparent 0px,
                    transparent 8px,
                    rgba(255, 255, 255, 0.04) 8px,
                    rgba(255, 255, 255, 0.04) 16px
                  )`,
                }}
              />
              <div className="relative px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none" style={{ filter: 'drop-shadow(0 0 4px rgba(255,212,0,0.4))' }}><HexagonIcon className="w-3.5 h-3.5" /></span>
                  <span className="text-[14px] font-black uppercase tracking-[0.15em]">DevTools</span>
                  {activeCount > 0 && (
                    <span
                      className="bg-pink text-text border border-current px-2 py-1 text-[15px] font-bold leading-none cursor-help animate-scale-in"
                      title={getActiveLabels(activeKeys).join(' · ')}
                    >
                      {activeCount} active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-mono text-bg/50 tracking-wider">{import.meta.env.MODE}</span>
                  <button
                    onClick={toggle}
                    className="relative w-6 h-6 flex items-center justify-center border border-bg/30 text-[14px] leading-none hover:bg-bg/20 hover:border-bg/50 active:bg-bg/30 transition-all cursor-pointer overflow-hidden group/close"
                    aria-label="Close dev tools"
                  >
                    {/* Diagonal hover effect */}
                    <span className="absolute inset-0 bg-bg/0 group-hover/close:bg-yellow/20 transition-colors -skew-x-12" />
                    <CloseIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {/* Bottom border accent line */}
              <div className="relative h-[2px] bg-yellow/60" style={{ width: '40%' }} />
            </div>

            {/* ── Tabs with animated indicator ── */}
            <div className="relative flex border-b-[3px] border-border shrink-0 bg-surface">
              {/* Sliding indicator */}
              <div
                className="absolute bottom-0 h-[3px] bg-yellow transition-all duration-200 ease-out z-[1]"
                style={{
                  width: tabWidth,
                  left: `calc(${tabIndex} * ${tabWidth})`,
                }}
              />
              {TABS.map(t => {
                const meta = TAB_META[t]
                const isActive = tab === t
                return (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className={`relative flex-1 py-2 px-1 text-[13px] font-bold uppercase tracking-wider border-r-[3px] border-border last:border-r-0 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 overflow-hidden ${
                      isActive
                        ? 'text-text'
                        : 'text-text-secondary hover:text-text hover:bg-yellow/10'
                    }`}
                  >
                    {/* Hover bg sweep */}
                    {!isActive && (
                      <span className="absolute inset-0 bg-yellow/0 hover:bg-yellow/8 transition-colors duration-150" />
                    )}
                    <span className={`text-[15px] leading-none transition-all duration-150 ${isActive ? 'scale-110' : 'hover:scale-110'}`}>
                      {meta.icon}
                    </span>
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {/* ── Content with tab transition animation ── */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin"
              style={{
                transition: 'opacity 0.12s ease, transform 0.12s ease',
                opacity: tabAnimating ? 0 : 1,
                transform: tabAnimating ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              {tab === 'triggers' && (
    <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <div className="flex-1 h-[2px] bg-border/30" />
                    <span className="text-[15px] font-black uppercase tracking-[0.2em] text-text-secondary/60">Debug Actions</span>
                    <div className="flex-1 h-[2px] bg-border/30" />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <DevActionBtn
                      label="SW Update"
                      desc="Simulate service worker update"
                      onClick={handleSimulateSWUpdate}
                      color="yellow"
                      entered={entered}
                      index={0}
                    />
                    <DevActionBtn
                      label="Force Error"
                      desc={`Throw test error #${errorCount + 1}`}
                      onClick={handleForceError}
                      color="pink"
                      entered={entered}
                      index={1}
                    />
                    <DevActionBtn
                      label={simOffline ? 'Restore Online' : 'Go Offline'}
                      desc={simOffline ? 'Restore navigator.onLine' : 'Override navigator.onLine'}
                      onClick={() => setSimOffline(o => !o)}
                      color="orange"
                      active={simOffline}
                      entered={entered}
                      index={2}
                    />
                    <DevActionBtn
                      label="Clear Cache"
                      desc="localStorage.clear() + reload"
                      onClick={handleClearAllCache}
                      color="pink"
                      entered={entered}
                      index={3}
                    />
                    <DevActionBtn
                      label="Hard Reload"
                      desc="window.location.reload()"
                      onClick={() => window.location.reload()}
                      color="purple"
                      entered={entered}
                      index={4}
                    />
                    <DevActionBtn
                      label="Log Auth"
                      desc="console.log(auth.currentUser)"
                      onClick={() => console.log('auth.currentUser:', user)}
                      color="blue"
                      entered={entered}
                      index={5}
                    />
                  </div>

                  <div
                    className="relative border-[3px] border-border bg-[var(--color-surface-light)] p-2 space-y-1 overflow-hidden"
                    style={{
                      animation: entered ? `fadeSlideUp 0.2s ease-out ${ENTRANCE_DELAY_BASE + 6 * ENTRANCE_DELAY_STEP}ms both` : undefined,
                    }}
                  >
                    {/* Decorative corner */}
                    <div className="absolute -top-[3px] -right-[3px] w-6 h-6 bg-yellow/20 clip-diagonal" />
                    <div className="text-[15px] font-black uppercase tracking-[0.15em] text-text-secondary/70 relative">Quick Info</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] font-mono leading-relaxed relative">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-yellow shrink-0" />
                        <span className="font-bold text-text">Route:</span>
                        <span className="text-text-secondary truncate">{pathname}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue shrink-0" />
                        <span className="font-bold text-text">UID:</span>
                        <span className="text-text-secondary">{(user?.uid ?? '—').slice(0, 12)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green shrink-0" />
                        <span className="font-bold text-text">Theme:</span>
                        <span className="text-text-secondary">{theme}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-purple shrink-0" />
                        <span className="font-bold text-text">Lang:</span>
                        <span className="text-text-secondary">{lang}</span>
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        <span className="w-1.5 h-1.5 bg-orange shrink-0" />
                        <span className="font-bold text-text">Online:</span>
                        <span className={`font-bold ${isOnline ? 'text-green' : 'text-pink'}`}>
                          {isOnline ? '● connected' : '● offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'scenarios' && (
                <ScenariosContent
                  sim={sim}
                  updateSim={updateSim}
                  resetSim={resetSim}
                  activeCount={activeCount}
                  spoilerFree={spoilerFree}
                  toggleSpoilerFree={toggleSpoilerFree}
                  swRegRef={swRegRef}
                  handleSimulateSWUpdate={handleSimulateSWUpdate}
                  lang={lang}
                  setLang={setLang}
                  theme={theme}
                  accent={accent}
                  setTheme={setTheme}
                  setAccent={setAccent}
                  activeKeys={activeKeys}
                  entered={entered}
                />
              )}

              {tab === 'state' && (
                <div className="p-3">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <div className="flex-1 h-[2px] bg-border/30" />
                    <span className="text-[15px] font-black uppercase tracking-[0.2em] text-text-secondary/60">Runtime State</span>
                    <div className="flex-1 h-[2px] bg-border/30" />
                  </div>
                  <div className="space-y-0.5">
                    {stateVars.map((v, i) => (
                      <VarRow key={v.label} {...v} copied={copied} onCopy={copyToClipboard} entered={entered} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {tab === 'vars' && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <div className="flex-1 h-[2px] bg-border/30" />
                    <span className="text-[15px] font-black uppercase tracking-[0.2em] text-text-secondary/60">Environment</span>
                    <div className="flex-1 h-[2px] bg-border/30" />
                  </div>
                  {/* Search */}
                  <div className="relative" style={{ animation: entered ? `fadeSlideUp 0.2s ease-out ${ENTRANCE_DELAY_BASE}ms both` : undefined }}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={varSearch}
                      onChange={e => setVarSearch(e.target.value)}
                      placeholder="Filter variables…"
                      className="w-full border-[3px] border-border bg-surface px-3 py-2 text-[13px] font-mono outline-none focus:border-yellow focus:bg-yellow/10 transition-all duration-150 placeholder:text-text-secondary/40 pl-8"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary/40 pointer-events-none"><SearchIcon className="w-3.5 h-3.5" /></span>
                    {varSearch && (
                      <button
                        onClick={() => setVarSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 border-2 border-border px-1.5 text-[12px] font-bold hover:bg-pink hover:text-text hover:border-pink active:translate-y-[calc(-50%+1px)] transition-all cursor-pointer"
                      >
                        <CloseIcon className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-[15px] font-mono text-text-secondary/60 px-1" style={{ animation: entered ? `fadeSlideUp 0.2s ease-out ${ENTRANCE_DELAY_BASE + ENTRANCE_DELAY_STEP}ms both` : undefined }}>
                    {filteredDebugVars.length} / {debugVars.length} variables
                  </div>
                  <div className="space-y-0.5">
                    {filteredDebugVars.map((v, i) => (
                      <VarRow key={v.label} {...v} copied={copied} onCopy={copyToClipboard} entered={entered} index={i + 10} />
                    ))}
                    {filteredDebugVars.length === 0 && (
                      <div className="text-center py-6 text-[13px] font-mono text-text-secondary/50">
                        <div className="mb-1"><SearchIcon className="w-6 h-6 text-text-secondary/40" /></div>
                        <div>No variables match &ldquo;{varSearch}&rdquo;</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'help' && <HelpTab />}
            </div>

            {/* ── Footer ── */}
            <div className="relative border-t-[3px] border-border px-3 py-2 flex items-center justify-between shrink-0 bg-[var(--color-surface-light)] overflow-hidden">
              {/* Subtle diagonal pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  background: `repeating-linear-gradient(
                    -45deg,
                    transparent 0px,
                    transparent 6px,
                    rgba(0,0,0,0.03) 6px,
                    rgba(0,0,0,0.03) 12px
                  )`,
                }}
              />
              <span className="relative text-[14px] font-mono text-text-secondary/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-yellow" />
                Time Capsules
                <kbd className="inline-flex items-center gap-0.5 border border-border/50 px-1 text-[14px] ml-1">
                  <span className="text-[15px]">⇧</span>D
                </kbd>
              </span>
              {activeCount > 0 && (
                <button
                  onClick={resetSim}
                  className="relative text-[15px] font-bold uppercase border-2 border-pink text-pink px-2 py-1 hover:bg-pink hover:text-text active:translate-y-0.5 transition-all cursor-pointer"
                >
                  Reset sims
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════
   SCENARIOS TAB
   ══════════════════════════════════════════════════════ */

function ScenariosContent({ sim, updateSim, resetSim, activeCount, spoilerFree, toggleSpoilerFree, swRegRef, handleSimulateSWUpdate, lang, setLang, theme, accent, setTheme, setAccent, activeKeys, entered }: {
  sim: DevSimState
  updateSim: (patch: Partial<DevSimState>) => void
  resetSim: () => void
  activeCount: number
  spoilerFree: boolean
  toggleSpoilerFree: (v: boolean) => void
  swRegRef: React.RefObject<ServiceWorkerRegistration | null>
  handleSimulateSWUpdate: () => void
  lang: Lang
  setLang: (l: Lang) => void
  theme: 'light' | 'dark'
  accent: AccentKey
  setTheme: (t: 'light' | 'dark') => void
  setAccent: (a: AccentKey) => void
  activeKeys: SimActiveKey[]
  entered: boolean
}) {
  const accentKeys = Object.keys(ACCENT_PRESETS) as AccentKey[]

  const injectNotif = (type: SimNotifType, title: string, body: string) => {
    updateSim({ injectedNotifications: [...sim.injectedNotifications, { type, title, body }] })
  }

  const clearNotifs = () => updateSim({ injectedNotifications: [] })

  const groupOptions: { value: SimGroupState; label: string; desc: string }[] = [
    { value: 'invite-pending', label: 'Invite Pending', desc: 'User has a pending group invite' },
    { value: 'solo-member', label: 'Solo Member', desc: 'Group with only 1 member' },
    { value: 'stale-member', label: 'Stale Member', desc: 'Member inactive for 30+ days' },
    { value: null, label: 'None', desc: 'Real group data' },
  ]

  let sectionIdx = 0
  const nextIdx = () => { const v = sectionIdx; sectionIdx++; return v }

  return (
    <div className="p-3 space-y-3">
      {/* Active simulations banner */}
      {activeCount > 0 && (
        <div
          className="border-[3px] border-pink bg-pink/8 p-3 space-y-2"
          style={{ animation: entered ? `fadeSlideUp 0.25s ease-out 0ms both` : undefined }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-black uppercase tracking-wider text-pink flex items-center gap-1.5">
              <span className="relative w-2.5 h-2.5 flex items-center justify-center">
                <span className="absolute w-2.5 h-2.5 bg-pink animate-ping opacity-30" />
                <span className="relative w-2 h-2 rounded-full bg-pink" />
              </span>
              {activeCount} active simulation{activeCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={resetSim}
              className="text-[15px] font-black uppercase border-2 border-pink text-pink px-2 py-1 hover:bg-pink hover:text-text active:translate-y-0.5 transition-all cursor-pointer"
            >
              Reset All
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {getActiveLabels(activeKeys).map((label, i) => (
              <span
                key={label}
                className="text-[15px] font-mono bg-pink/15 text-pink border border-pink/30 px-1.5 py-0.5"
                style={{ animation: entered ? `fadeSlideUp 0.2s ease-out ${30 + i * 20}ms both` : undefined }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 1. User type */}
      <ScenarioSection icon={<PersonIcon />} title="User Type" note="Override hook return values" entered={entered} index={nextIdx()}>
        <ScenarioToggle
          label="Empty state"
          desc="No history, watchlist, or lists — test zero KPIs"
          active={sim.simulateEmptyState}
          onToggle={() => updateSim({ simulateEmptyState: !sim.simulateEmptyState, simulateHighVolume: false })}
        />
        <ScenarioToggle
          label="Power user"
          desc="~200+ items — test virtualization &amp; performance"
          active={sim.simulateHighVolume}
          onToggle={() => updateSim({ simulateHighVolume: !sim.simulateHighVolume, simulateEmptyState: false })}
        />
      </ScenarioSection>

      {/* 2. Network */}
      <ScenarioSection icon={<GlobeIcon />} title="Network" note="Override latency &amp; failures" entered={entered} index={nextIdx()}>
        <div className="space-y-3">
          <SliderControl
            label="Latency"
            value={sim.simulateLatencyMs}
            max={5000}
            step={100}
            onChange={v => updateSim({ simulateLatencyMs: v })}
            format={v => v > 0 ? `${v}ms` : 'off'}
            markers={['0ms', '500ms', '1s', '2s', '5s']}
            markerValues={[0, 500, 1000, 2000, 5000]}
          />
          <SliderControl
            label="Failures"
            value={sim.simulateFailureRate * 100}
            max={75}
            step={5}
            onChange={v => updateSim({ simulateFailureRate: v / 100 })}
            format={v => v > 0 ? `${Math.round(v)}%` : 'off'}
            markers={['0%', '25%', '50%', '75%']}
            markerValues={[0, 25, 50, 75]}
          />
        </div>
      </ScenarioSection>

      {/* 3. Errors */}
      <ScenarioSection icon={<ErrorIcon />} title="Error Simulation" note="Intercept next service call" entered={entered} index={nextIdx()}>
        <div className="grid grid-cols-2 gap-2">
          <ChipSelector
            label="Firestore"
            options={[
              { value: 'permission-denied', label: 'Permission' },
              { value: 'not-found', label: 'Not Found' },
              { value: 'unavailable', label: 'Unavailable' },
              { value: null, label: 'None' },
            ] as const}
            selected={sim.firestoreError}
            onChange={v => updateSim({ firestoreError: v as SimFirestoreError })}
            activeColor="pink"
          />
          <ChipSelector
            label="TMDB"
            options={[
              { value: 'rate-limit', label: '429 Rate' },
              { value: 'not-found', label: '404 Not Found' },
              { value: 'server-error', label: '500 Server' },
              { value: null, label: 'None' },
            ] as const}
            selected={sim.tmdbError}
            onChange={v => updateSim({ tmdbError: v as SimTmdbError })}
            activeColor="orange"
          />
        </div>
      </ScenarioSection>

      {/* 4. Groups */}
      <ScenarioSection icon={<GroupIcon />} title="Group States" note="Override group service responses" entered={entered} index={nextIdx()}>
        <div className="grid grid-cols-2 gap-2">
          {groupOptions.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => updateSim({ groupState: opt.value })}
              className={`text-left border-[3px] px-3 py-2 transition-all duration-100 cursor-pointer active:translate-y-0.5 ${
                sim.groupState === opt.value
                  ? 'bg-purple/25 text-text border-purple shadow-[inset_0_0_0_1px_rgba(168,85,247,0.3)]'
                  : 'bg-surface text-text border-border hover:bg-purple/12 hover:border-purple/50'
              }`}
              style={{ animation: entered ? `fadeSlideUp 0.2s ease-out ${ENTRANCE_DELAY_BASE + 60 + i * 20}ms both` : undefined }}
            >
              <div className="text-[12px] font-bold uppercase leading-tight">{opt.label}</div>
              <div className="text-[14px] font-mono text-text-secondary mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </ScenarioSection>

      {/* 5. Notifications */}
      <ScenarioSection
        icon={<BellIcon />}
        title="Test Notifications"
        note={sim.injectedNotifications.length > 0 ? `${sim.injectedNotifications.length} injected` : undefined}
        entered={entered}
        index={nextIdx()}
      >
        <div className="grid grid-cols-2 gap-1.5">
          <ScenarioNotifBtn
            label={<span className="flex items-center gap-1"><MonitorIcon className="w-3 h-3" /> Upcoming Episode</span>}
            desc="Stranger Things S5E1 · 2 days"
            onClick={() => injectNotif('upcoming_episode', 'Stranger Things S5E1', 'Airs in 2 days')}
            color="yellow"
          />
          <ScenarioNotifBtn
            label={<span className="flex items-center gap-1"><RefreshIcon className="w-3 h-3" /> Show Returning</span>}
            desc="The Office S8 premieres"
            onClick={() => injectNotif('show_returning', 'The Office returns!', 'Season 8 premieres')}
            color="blue"
          />
        </div>
        {sim.injectedNotifications.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={clearNotifs}
              className="flex-1 text-[15px] font-black uppercase border-2 border-pink text-pink px-2 py-1.5 hover:bg-pink hover:text-text active:translate-y-0.5 transition-all cursor-pointer"
            >
              <CloseIcon className="w-2.5 h-2.5" /> Clear ({sim.injectedNotifications.length})
            </button>
            <span className="text-[14px] font-mono text-text-secondary/40">Refresh to see in panel</span>
          </div>
        )}
      </ScenarioSection>

      {/* 6. PWA */}
      <ScenarioSection icon={<PackageIcon />} title="PWA / Service Worker" note="Live SW state" entered={entered} index={nextIdx()}>
        <div className="grid grid-cols-2 gap-1.5">
          <DevActionBtn
            label="SW Update"
            desc="Dispatch update event"
            onClick={handleSimulateSWUpdate}
            color="yellow"
            entered={entered}
            index={0}
          />
          <DevActionBtn
            label="Show Install"
            desc="Force PWA install banner to appear"
            onClick={() => window.dispatchEvent(new CustomEvent('force-install-banner'))}
            color="pink"
            entered={entered}
            index={1}
          />
        </div>
        <div className="border-[3px] border-border bg-[var(--color-surface-light)] p-1.5 space-y-1">
          <div className="text-[15px] font-bold uppercase tracking-wider text-text-secondary/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-yellow" />
            SW Status
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[15px] font-mono text-text-secondary">
            <div className="flex items-center gap-1">
              <span className="font-bold text-text">State:</span>
              {swRegRef.current?.active ? <span className="text-green flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-green" />active</span>
                : swRegRef.current?.waiting ? <span className="text-yellow flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-yellow" />waiting</span>
                : swRegRef.current?.installing ? <span className="text-blue flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-blue" />installing</span>
                : <span className="text-text-secondary/50">— not registered</span>}
            </div>
            <div><span className="font-bold text-text">Update:</span> {window.__swPendingReload ? <span className="text-green">✅ pending</span> : <span className="text-text-secondary/50">—</span>}</div>
            <div className="col-span-2 truncate"><span className="font-bold text-text">Scope:</span> <span className="text-text-secondary/70">{swRegRef.current?.scope ?? '—'}</span></div>
          </div>
        </div>
      </ScenarioSection>

      {/* 7. Locale / Theme / Accent */}
      <ScenarioSection icon={<PaletteIcon />} title="Locale · Theme · Accent" note="Quick toggle" entered={entered} index={nextIdx()}>
        <div className="space-y-2.5">
          <ToggleRow label="Language">
            <div className="flex gap-1">
              {(['en', 'es'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`relative text-[12px] font-bold uppercase border-[3px] px-2.5 py-1 transition-all duration-100 cursor-pointer active:translate-y-0.5 ${
                    lang === l
                      ? 'bg-yellow text-text border-yellow shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]'
                      : 'bg-surface text-text border-border hover:bg-yellow/20 hover:border-yellow'
                  }`}
                >
                  {l === 'en' ? '🇬🇧 EN' : '🇪🇸 ES'}
                </button>
              ))}
            </div>
          </ToggleRow>

          <ToggleRow label="Theme">
            <div className="flex gap-1">
              {(['light', 'dark'] as const).map(th => (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={`relative text-[12px] font-bold uppercase border-[3px] px-2.5 py-1 transition-all duration-100 cursor-pointer active:translate-y-0.5 ${
                    theme === th
                      ? 'bg-text text-bg border-text shadow-[inset_0_-2px_0_rgba(255,255,255,0.2)]'
                      : 'bg-surface text-text border-border hover:bg-text/10 hover:border-text/50'
                  }`}
                >
                  {th === 'light' ? '☀️ Light' : '🌙 Dark'}
                </button>
              ))}
            </div>
          </ToggleRow>

          <ToggleRow label="Accent">
            <div className="flex gap-1 flex-wrap">
              {accentKeys.map(k => (
                <button
                  key={k}
                  onClick={() => setAccent(k)}
                  className={`w-5 h-5 border-[3px] transition-all duration-100 cursor-pointer active:scale-95 ${
                    accent === k
                      ? 'border-border scale-125 shadow-[0_0_0_2px_var(--color-yellow)]'
                      : 'border-border/30 hover:scale-110 hover:border-border/70'
                  }`}
                  style={{ backgroundColor: ACCENT_PRESETS[k] }}
                  aria-label={k}
                  title={k}
                />
              ))}
            </div>
          </ToggleRow>
        </div>
      </ScenarioSection>

      {/* 8. Spoiler */}
      <ScenarioSection icon={<EyeOffIcon />} title="Spoiler-free Mode" note="Override useSpoilerFree" entered={entered} index={nextIdx()}>
        <ScenarioToggle
          label={spoilerFree ? 'Spoiler-free: ON' : 'Spoiler-free: OFF'}
          desc={spoilerFree ? 'Episode details are blurred' : 'All content visible'}
          active={spoilerFree}
          onToggle={() => toggleSpoilerFree(!spoilerFree)}
        />
        {spoilerFree && (
          <div className="border-[3px] border-border bg-[var(--color-surface-light)] p-1.5 space-y-1">
            <div className="text-[15px] font-bold uppercase tracking-wider text-text-secondary/70 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-pink" />
              Hidden content
            </div>
            <ul className="text-[15px] font-mono text-text-secondary space-y-0.5">
              {['Episode titles & numbers (EpisodeRow)', 'Season progress bars (SeasonSection)', 'Upcoming air dates (Dashboard)', 'Rating inputs (RatingPicker)'].map((item) => (
                <li key={item} className="flex items-center gap-1">
                  <span className="text-pink/60">▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ScenarioSection>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SCENARIO SUBCOMPONENTS
   ══════════════════════════════════════════════════════ */

function ScenarioSection({ icon, title, note, children, entered, index }: {
  icon: React.ReactNode
  title: string
  note?: string
  children: React.ReactNode
  entered: boolean
  index: number
}) {
  return (
    <div
      className="border-[3px] border-border p-3 space-y-3 bg-surface"
      style={{
        animation: entered
          ? `fadeSlideUp 0.25s ease-out ${ENTRANCE_DELAY_BASE + index * ENTRANCE_DELAY_STEP}ms both`
          : undefined,
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-black uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-sm leading-none">{icon}</span>
          {title}
        </span>
        {note && <span className="text-[14px] font-mono text-text-secondary/40 text-right shrink-0">{note}</span>}
      </div>
      {children}
    </div>
  )
}

function ScenarioToggle({ label, desc, active, onToggle }: {
  label: string
  desc: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left border-[3px] px-3 py-2 transition-all duration-100 cursor-pointer active:translate-y-0.5 ${
          active
            ? 'bg-yellow/18 text-text border-yellow shadow-[inset_0_0_0_1px_rgba(255,212,0,0.2)]'
            : 'bg-surface text-text border-border hover:bg-yellow/8 hover:border-yellow/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-5 h-5 border-[3px] flex items-center justify-center shrink-0 transition-all duration-150 ${
            active ? 'bg-yellow border-yellow' : 'border-border bg-transparent'
          }`}
        >
          {active && (
            <span className="text-[12px] font-black text-text leading-none" style={{ transform: 'scale(0.85)' }}>
              ✓
            </span>
          )}
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-bold uppercase leading-tight">{label}</div>
          <div className="text-[15px] font-mono text-text-secondary/70 mt-0.5 leading-tight">{desc}</div>
        </div>
      </div>
    </button>
  )
}

function ToggleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[36px]">
      <span className="text-[12px] font-bold uppercase text-text-secondary/60 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function SliderControl({ label, value, max, step, onChange, format, markers, markerValues }: {
  label: string
  value: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
  markers: string[]
  markerValues: number[]
}) {
  const filledPct = (value / max) * 100
  const displayValue = format(value)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-bold uppercase text-text-secondary/70">{label}</span>
        <span className={`text-[13px] font-mono tabular-nums transition-colors ${
          value > 0 ? 'text-orange font-bold' : 'text-text-secondary/50'
        }`}>
          {displayValue}
        </span>
      </div>
      <div className="relative h-2 border-[3px] border-border bg-surface group/slider">
        {/* Filled track */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-yellow/40 transition-all duration-150"
          style={{ width: `${filledPct}%` }}
        />
        {/* Native range for interaction */}
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-[1]"
        />
        {/* Visual knob with tooltip */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 border-[3px] border-border bg-text transition-all duration-150 pointer-events-none z-[2]"
          style={{ left: `calc(${filledPct}% - 7px)` }}
        >
          {/* Tooltip above knob */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/slider:opacity-100 transition-all duration-150 translate-y-0.5 group-hover/slider:translate-y-0">
            <div className="bg-text text-bg border-[2px] border-border shadow-brutal-xs px-1.5 py-0.5 text-[12px] font-mono font-bold whitespace-nowrap tabular-nums leading-none">
              {displayValue}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-text" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[14px] font-mono text-text-secondary/40 mt-0.5 px-[2px]">
        {markers.map((m, i) => (
          <span key={m} className={value >= markerValues[i] ? 'font-bold text-text/60' : ''}>{m}</span>
        ))}
      </div>
    </div>
  )
}

function ChipSelector<T extends string | null>({ label, options, selected, onChange, activeColor }: {
  label: string
  options: readonly { value: T; label: string }[]
  selected: T
  onChange: (v: T) => void
  activeColor: 'pink' | 'orange'
}) {
  const activeStyles = activeColor === 'pink'
    ? 'bg-pink text-text border-pink shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]'
    : 'bg-orange text-text border-orange shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]'
  const hoverStyles = activeColor === 'pink'
    ? 'hover:bg-pink/20 hover:border-pink/60'
    : 'hover:bg-orange/20 hover:border-orange/60'

  return (
    <div>
      <span className="text-[12px] font-bold uppercase text-text-secondary/70 block mb-1">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            className={`text-[15px] font-bold uppercase border-[3px] px-2 py-1 transition-all duration-100 cursor-pointer active:translate-y-0.5 ${
              selected === opt.value
                ? activeStyles
                : `bg-surface text-text border-border ${hoverStyles}`
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SHARED SUBCOMPONENTS
   ══════════════════════════════════════════════════════ */

function VarRow({ label, value, note, copied, onCopy, entered, index }: DebugVar & {
  copied: string | null
  onCopy: (l: string, v: string) => void
  entered: boolean
  index: number
}) {
  const display = formatVal(value)
  const valColor = getValueColor(value)

  return (
    <div
      className="group flex items-start gap-2 py-1.5 px-1.5 border-b border-border/10 last:border-b-0 hover:bg-yellow/6 hover:border-l-2 hover:border-l-yellow hover:pl-[2px] transition-all duration-100"
      style={{
        animation: entered
          ? `fadeSlideUp 0.2s ease-out ${ENTRANCE_DELAY_BASE + index * ENTRANCE_DELAY_STEP}ms both`
          : undefined,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold uppercase leading-tight flex items-center gap-1.5">
          {label}
          {note && <span className="text-[14px] font-mono text-text-secondary/30 font-normal lowercase">{note}</span>}
        </div>
        <div className={`text-[13px] font-mono break-all leading-tight mt-0.5 ${valColor}`}>{display}</div>
      </div>
      <button
        onClick={() => onCopy(label, String(value ?? ''))}
        className="shrink-0 w-5 h-5 flex items-center justify-center border-[2px] border-border/30 text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-100 hover:bg-yellow hover:border-yellow hover:text-text active:scale-90 cursor-pointer"
        aria-label={`Copy ${label}`}
        title="Copy value"
      >
        {copied === label ? (
          <span className="text-green scale-110 block leading-none">✓</span>
        ) : (
          <span className="block leading-none tracking-wider">C</span>
        )}
      </button>
    </div>
  )
}

const COLOR_MAP: Record<string, string> = {
  yellow: 'bg-yellow/12 text-text border-border hover:bg-yellow hover:text-text hover:border-yellow',
  pink: 'bg-pink/12 text-pink border-border hover:bg-pink hover:text-text hover:border-pink',
  orange: 'bg-orange/12 text-orange border-border hover:bg-orange hover:text-text hover:border-orange',
  purple: 'bg-purple/12 text-purple border-border hover:bg-purple hover:text-text hover:border-purple',
  blue: 'bg-blue/12 text-blue border-border hover:bg-blue hover:text-text hover:border-blue',
}
const ACTIVE_MAP: Record<string, string> = {
  yellow: 'bg-yellow text-text border-yellow shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]',
  pink: 'bg-pink text-text border-pink shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]',
  orange: 'bg-orange text-text border-orange shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]',
  purple: 'bg-purple text-text border-purple shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]',
  blue: 'bg-blue text-text border-blue shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]',
}

function DevActionBtn({ label, desc, onClick, color, active, entered, index }: {
  label: string
  desc: string
  onClick: () => void
  color: 'yellow' | 'pink' | 'orange' | 'purple' | 'blue'
  active?: boolean
  entered?: boolean
  index?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left border-[3px] px-3 py-2 transition-all duration-100 cursor-pointer leading-tight active:translate-y-0.5 ${
        active ? ACTIVE_MAP[color] : COLOR_MAP[color]
      }`}
      style={{
        animation: entered
          ? `fadeSlideUp 0.2s ease-out ${ENTRANCE_DELAY_BASE + (index ?? 0) * ENTRANCE_DELAY_STEP}ms both`
          : undefined,
      }}
    >
      <div className="text-[12px] font-bold uppercase">{label}</div>
      <div className="text-[15px] font-mono text-current/50 mt-0.5 leading-tight">{desc}</div>
    </button>
  )
}

function ScenarioNotifBtn({ label, desc, onClick, color }: {
  label: string | React.ReactNode
  desc: string
  onClick: () => void
  color: 'yellow' | 'blue'
}) {
  const baseStyles = color === 'yellow'
    ? 'bg-yellow/12 text-text border-border hover:bg-yellow hover:border-yellow'
    : 'bg-blue/12 text-text border-border hover:bg-blue hover:border-blue hover:text-text'

  return (
    <button
      onClick={onClick}
      className={`text-left border-[3px] px-3 py-2 transition-all duration-100 cursor-pointer active:translate-y-0.5 ${baseStyles}`}
    >
      <span className="text-[12px] font-bold uppercase block">{label}</span>
      <span className="text-[15px] font-mono text-current/50 mt-0.5 block leading-tight">{desc}</span>
    </button>
  )
}

const COMPONENT_GROUPS = [
  {
    title: 'Layout & Shell',
    items: [
      { name: 'Layout', file: 'src/components/Layout.tsx', desc: 'App shell — sidebar, header, Outlet' },
      { name: 'AppHeader', file: 'src/components/AppHeader.tsx', desc: 'Top header bar' },
      { name: 'OfflineBanner', file: 'src/components/OfflineBanner.tsx', desc: 'Offline connectivity banner' },
      { name: 'InstallBanner', file: 'src/components/InstallBanner.tsx', desc: 'PWA install prompt' },
      { name: 'ScrollToTop', file: 'src/components/ScrollToTop.tsx', desc: 'Auto scroll top on route' },
      { name: 'ReloadButton', file: 'src/components/ReloadButton.tsx', desc: 'SW update reload button' },
    ],
  },
  {
    title: 'Show & Episode',
    items: [
      { name: 'ShowCard', file: 'src/components/ShowCard.tsx', desc: 'Show poster + name card' },
      { name: 'EpisodeRow', file: 'src/components/show-detail/EpisodeRow.tsx', desc: 'Single episode row' },
      { name: 'SeasonSection', file: 'src/components/show-detail/SeasonSection.tsx', desc: 'Season with episodes' },
      { name: 'RatingPicker', file: 'src/components/show-detail/RatingPicker.tsx', desc: 'Rating selector' },
      { name: 'EmotionPicker', file: 'src/components/EmotionPicker.tsx', desc: 'Emotion selector' },
      { name: 'CollectionGrid', file: 'src/components/show-detail/CollectionGrid.tsx', desc: 'Collection/media grid' },
      { name: 'MediaGrid', file: 'src/components/show-detail/MediaGrid.tsx', desc: 'Media grid layout' },
    ],
  },
  {
    title: 'Dashboards & Sections',
    items: [
      { name: 'DashboardHero', file: 'src/components/DashboardHero.tsx', desc: 'Dashboard hero section' },
      { name: 'SectionHeader', file: 'src/components/SectionHeader.tsx', desc: 'Section title + actions' },
      { name: 'ContinueWatching', file: 'src/components/ContinueWatching.tsx', desc: 'Continue watching rail' },
      { name: 'UpcomingTimeline', file: 'src/components/UpcomingTimeline.tsx', desc: 'Upcoming episodes timeline' },
      { name: 'EmptyState', file: 'src/components/EmptyState.tsx', desc: 'Empty state placeholder' },
      { name: 'Loading', file: 'src/components/Loading.tsx', desc: 'Loading spinner' },
      { name: 'ErrorBox', file: 'src/components/ErrorBox.tsx', desc: 'Error display box' },
    ],
  },
  {
    title: 'Show Detail',
    items: [
      { name: 'CatchUpModal', file: 'src/components/show-detail/CatchUpModal.tsx', desc: 'Catch-up modal' },
      { name: 'ConfirmSeasonModal', file: 'src/components/show-detail/ConfirmSeasonModal.tsx', desc: 'Season confirmation' },
      { name: 'PositionEditor', file: 'src/components/show-detail/PositionEditor.tsx', desc: 'Position/season editor' },
      { name: 'StreamProviders', file: 'src/components/show-detail/StreamProviders.tsx', desc: 'Streaming provider list' },
    ],
  },
  {
    title: 'Hooks & Services',
    items: [
      { name: 'useFollowedShows', file: 'src/hooks/useFollowedShows.ts', desc: 'Follow/unfollow shows' },
      { name: 'useHistory', file: 'src/hooks/useHistory.ts', desc: 'Watched episode history' },
      { name: 'useStats', file: 'src/hooks/useStats.ts', desc: 'User statistics' },
      { name: 'useDevice', file: 'src/hooks/useDevice.ts', desc: 'Device detection' },
      { name: 'tmdb', file: 'src/services/tmdb.ts', desc: 'TMDB API client' },
      { name: 'useNotifications', file: 'src/hooks/useNotifications.ts', desc: 'Notification state' },
    ],
  },
]

const HELP_ITEMS: { title: string; icon?: React.ReactNode; items: { name: string; desc: string; tag: string }[] }[] = [
  {
    title: 'Keyboard Shortcuts',
    icon: <KeyboardIcon className="w-3 h-3" />,
    items: [
      { name: 'Toggle Panel', desc: 'Shift + D — Open/close DevTools panel', tag: 'shortcut' },
      { name: 'Close Panel', desc: 'Escape — Close DevTools panel', tag: 'shortcut' },
    ],
  },
  {
    title: 'State Tab',
    icon: <DiamondIcon className="w-3 h-3" />,
    items: [
      { name: 'Route', desc: 'Current pathname + query string', tag: 'state' },
      { name: 'User Auth', desc: 'Firebase Auth UID (first 8 chars)', tag: 'state' },
      { name: 'Theme', desc: 'light | dark', tag: 'state' },
      { name: 'Accent', desc: 'Current accent color preset', tag: 'state' },
      { name: 'Language', desc: 'en | es', tag: 'state' },
      { name: 'Online', desc: 'navigator.onLine status', tag: 'state' },
      { name: 'SW Pending', desc: 'Service worker update pending', tag: 'state' },
      { name: 'SW Complete', desc: 'Service worker update complete', tag: 'state' },
      { name: 'Error count', desc: 'Forced error counter from Triggers tab', tag: 'state' },
    ],
  },
  {
    title: 'Vars Tab',
    icon: <TargetIcon className="w-3 h-3" />,
    items: [
      { name: 'VITE mode', desc: 'development | production', tag: 'var' },
      { name: 'VITE DEV', desc: 'true if development mode', tag: 'var' },
      { name: 'VITE PROD', desc: 'true if production mode', tag: 'var' },
      { name: 'User email', desc: 'Firebase auth email', tag: 'var' },
      { name: 'User ID', desc: 'Firebase auth UID (full)', tag: 'var' },
      { name: 'Display name', desc: 'Firebase displayName', tag: 'var' },
      { name: 'Auth provider', desc: 'List of auth providers (google.com, password, etc.)', tag: 'var' },
      { name: 'User created', desc: 'Account creation timestamp', tag: 'var' },
      { name: 'Last sign in', desc: 'Last sign-in timestamp', tag: 'var' },
      { name: 'Email verified', desc: 'Whether email is verified', tag: 'var' },
      { name: 'isAnonymous', desc: 'Whether user is anonymous/guest', tag: 'var' },
      { name: 'Window size', desc: 'Viewport dimensions (WxH)', tag: 'var' },
      { name: 'User agent', desc: 'Browser user agent string', tag: 'var' },
    ],
  },
  {
    title: 'Triggers Tab',
    icon: <BoltIcon className="w-3 h-3" />,
    items: [
      { name: 'SW Update', desc: 'Simulate service worker update available event', tag: 'trigger' },
      { name: 'Force Error', desc: 'Throw a test error to check error boundaries', tag: 'trigger' },
      { name: 'Go Offline / Restore', desc: 'Override navigator.onLine to test offline mode', tag: 'trigger' },
      { name: 'Clear Cache', desc: 'Clear all localStorage data + reload page', tag: 'trigger' },
      { name: 'Hard Reload', desc: 'Force window.location.reload()', tag: 'trigger' },
      { name: 'Log Auth', desc: 'Log Firebase auth currentUser to browser console', tag: 'trigger' },
    ],
  },
  {
    title: 'Scenarios Tab',
    icon: <FlaskIcon className="w-3 h-3" />,
    items: [
      { name: 'Empty State', desc: 'Simulate zero history, watchlist, or lists', tag: 'scenario' },
      { name: 'Power User', desc: 'Simulate ~200+ items for performance testing', tag: 'scenario' },
      { name: 'Latency', desc: 'Add artificial delay (0-5000ms) to all service calls', tag: 'scenario' },
      { name: 'Failures', desc: 'Simulate random failures (0-75%) in service calls', tag: 'scenario' },
      { name: 'Firestore Errors', desc: 'Simulate Permission Denied, Not Found, Unavailable', tag: 'scenario' },
      { name: 'TMDB Errors', desc: 'Simulate 429 Rate Limit, 404 Not Found, 500 Server Error', tag: 'scenario' },
      { name: 'Group States', desc: 'Override group: Invite Pending, Solo Member, Stale Member', tag: 'scenario' },
      { name: 'Test Notifications', desc: 'Inject Upcoming Episode or Show Returning notifications', tag: 'scenario' },
      { name: 'PWA / SW', desc: 'Test SW update event or simulated install failure', tag: 'scenario' },
      { name: 'Locale / Theme / Accent', desc: 'Quick toggle language (EN/ES), theme, accent color', tag: 'scenario' },
      { name: 'Spoiler-free Mode', desc: 'Toggle blur on episode titles, progress bars, ratings', tag: 'scenario' },
    ],
  },
]

function HelpTab() {
  const [helpSearch, setHelpSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())

  const toggleGroup = useCallback((title: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }, [])

  const allGroups = useMemo(() => {
    const componentGroups = COMPONENT_GROUPS.map(g => ({
      title: `${g.title} (Components)`,
      icon: <PuzzleIcon className="w-3 h-3" />,
      items: g.items.map(item => ({
        name: item.name,
        desc: `${item.desc} - ${item.file}`,
        tag: 'component',
      })),
    }))
    return [...HELP_ITEMS, ...componentGroups]
  }, [])

  const totalCount = useMemo(() => allGroups.reduce((sum, g) => sum + g.items.length, 0), [allGroups])

  const filtered = useMemo(() => {
    if (!helpSearch.trim()) return allGroups
    const q = helpSearch.toLowerCase()
    return allGroups
      .map(g => ({
        ...g,
        items: g.items.filter(item =>
          item.name.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.items.length > 0)
  }, [helpSearch, allGroups])

  const visibleCount = useMemo(() => filtered.reduce((sum, g) => sum + g.items.length, 0), [filtered])

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Search bar */}
      <div className="relative" style={{ animation: 'fadeSlideUp 0.2s ease-out 30ms both' }}>
        <input
          type="text"
          value={helpSearch}
          onChange={e => setHelpSearch(e.target.value)}
          placeholder="Search help…"
          className="w-full border-[3px] border-border bg-surface px-3 py-2 text-[13px] font-mono outline-none focus:border-yellow focus:bg-yellow/10 transition-all duration-150 placeholder:text-text-secondary/40 pl-8"
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary/40 pointer-events-none"><SearchIcon className="w-3.5 h-3.5" /></span>
        {helpSearch && (
          <button
            onClick={() => setHelpSearch('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 border-2 border-border px-1.5 text-[12px] font-bold hover:bg-pink hover:text-text hover:border-pink active:translate-y-[calc(-50%+1px)] transition-all cursor-pointer"
          >
            <CloseIcon className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-[15px] font-mono text-text-secondary/60">
          {visibleCount} / {totalCount} items
        </span>
        {helpSearch && (
          <button
            onClick={() => setHelpSearch('')}
            className="text-[11px] font-bold uppercase border-2 border-border px-2 py-0.5 hover:bg-pink hover:text-text hover:border-pink active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1"
          >
            <CloseIcon className="w-2.5 h-2.5" />
            Clear filters
          </button>
        )}
      </div>

      <div className="space-y-4" key={helpSearch || 'all'}>
        {filtered.map((group, gi) => (
          <div key={group.title}>
            <div
              className="flex items-center gap-1.5 mb-2 cursor-pointer select-none group/header hover:opacity-80 transition-opacity"
              onClick={() => toggleGroup(group.title)}
              style={{ animation: `fadeSlideUp 0.2s ease-out ${gi * 30}ms both` }}
            >
              <span className="w-2 h-2 bg-yellow shrink-0" />
              {group.icon && <span className="text-text-secondary/80 shrink-0">{group.icon}</span>}
              <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary/80">{group.title}</span>
              <span className="text-[10px] font-bold font-mono border border-border/30 px-1.5 py-0.5 leading-none text-text-secondary/60 shrink-0">{group.items.length}</span>
              <span className="text-[10px] font-mono text-text-secondary/30 transition-transform duration-200 shrink-0" style={{ transform: collapsedGroups.has(group.title) ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
              <div className="flex-1 h-[1px] bg-border/20" />
            </div>
            <div
              className="grid grid-cols-1 gap-1.5 overflow-y-hidden transition-all duration-200 ease-out"
              style={{ maxHeight: collapsedGroups.has(group.title) ? '0px' : '2000px' }}
            >
                {group.items.map((item, ii) => (
                  <div
                    key={item.name}
                    className="border-l-[3px] border-border/30 pl-3 py-1.5 hover:border-l-yellow hover:bg-yellow/4 transition-all duration-100"
                    style={{ animation: collapsedGroups.has(group.title) ? undefined : `fadeSlideUp 0.2s ease-out ${(gi * 30) + (ii * 20)}ms both` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold uppercase leading-tight text-text">{item.name}</span>
                      <span className={`text-[10px] font-bold uppercase px-1 py-0.5 leading-none ${
                        item.tag === 'shortcut' ? 'bg-purple/20 text-purple border border-purple/30' :
                        item.tag === 'state' ? 'bg-blue/20 text-blue border border-blue/30' :
                        item.tag === 'var' ? 'bg-green/20 text-green border border-green/30' :
                        item.tag === 'trigger' ? 'bg-orange/20 text-orange border border-orange/30' :
                        item.tag === 'scenario' ? 'bg-pink/20 text-pink border border-pink/30' :
                        'bg-yellow/20 text-text border border-yellow/30'
                      }`}>
                        {item.tag}
                      </span>
                  </div>
                  <div className="text-[11px] font-mono text-text-secondary/50 leading-tight mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-6 text-[13px] font-mono text-text-secondary/50" style={{ animation: 'fadeSlideUp 0.2s ease-out 30ms both' }}>
            <div className="mb-1"><SearchIcon className="w-5 h-5 text-text-secondary/40" /></div>
            <div>No results match &ldquo;{helpSearch}&rdquo;</div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatVal(v: string | number | boolean | null | undefined): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  if (v.length > 100) return v.slice(0, 97) + '…'
  return v || '—'
}

function getValueColor(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'text-text-secondary/40'
  if (typeof v === 'boolean') return 'text-orange font-medium'
  if (typeof v === 'number') return 'text-blue font-medium'
  if (typeof v === 'string') {
    if (v.startsWith('http') || v.startsWith('/')) return 'text-green font-medium'
    if (v === 'true' || v === 'false') return 'text-orange font-medium'
  }
  return 'text-text-secondary/80'
}
