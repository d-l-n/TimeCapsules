import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme, ACCENT_PRESETS, type AccentKey } from '../lib/ThemeContext'
import { useI18n, type Lang } from '../lib/I18nContext'
import { useOnlineStatus, useSpoilerFree } from '../hooks'
import { useDevSimulation } from '../lib/dev-simulation'
import { getActiveLabels, setDevSimState, type DevSimState, type SimNotifType, type SimFirestoreError, type SimTmdbError, type SimGroupState, type SimActiveKey } from '../lib/dev-simulation-types'

const TABS = ['state', 'vars', 'triggers', 'scenarios'] as const
type DevTab = typeof TABS[number]

const TAB_META: Record<DevTab, { label: string; icon: string }> = {
  state: { label: 'State', icon: '◈' },
  vars: { label: 'Vars', icon: '◎' },
  triggers: { label: 'Triggers', icon: '↯' },
  scenarios: { label: 'Scenarios', icon: '⬡' },
}

interface DebugVar {
  label: string
  value: string | number | boolean | null | undefined
  note?: string
}

/* ── Keyboard shortcut ─────────────────── */
const STORAGE_POS = 'tc_dev_panel_open'
const SHORTCUT_KEY = 'd'

export default function DevTools() {
  const [open, setOpen] = useState(() => sessionStorage.getItem(STORAGE_POS) === '1')
  const [tab, setTab] = useState<DevTab>('state')
  const { pathname, search } = useLocation()
  const { user } = useAuth()
  const { theme, accent, setTheme, setAccent } = useTheme()
  const { lang, setLang } = useI18n()
  const isOnline = useOnlineStatus()
  const [errorCount, setErrorCount] = useState(0)
  const [simOffline, setSimOffline] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

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
  const { state: sim, update: updateSim, reset: resetSim, activeKeys } = useDevSimulation()
  const [spoilerFree, toggleSpoilerFree] = useSpoilerFree()
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [varSearch, setVarSearch] = useState('')

  // Persist open state
  useEffect(() => {
    sessionStorage.setItem(STORAGE_POS, open ? '1' : '0')
  }, [open])

  const toggle = useCallback(() => setOpen(o => !o), [])

  // Keyboard shortcut: Shift+D to toggle, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === SHORTCUT_KEY && e.shiftKey && !e.repeat) {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
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

  return (
    <>
      {/* ── Floating trigger badge ── */}
      {!open && (
        <div className="fixed top-4 right-[15%] z-[9999] group print:hidden">
          <button
            onClick={toggle}
            className="relative border-[3px] border-border bg-text text-bg hover:bg-yellow hover:text-text active:translate-y-0.5 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-brutal-sm transition-all duration-150 cursor-pointer"
            aria-label="Open dev tools (Shift+D)"
            title="Open DevTools (Shift+D)"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">⬡</span>
              <span>DEV</span>
            </span>
            {activeCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[8px] font-bold min-w-[18px] h-[18px] flex items-center justify-center leading-none animate-scale-in">
                {activeCount}
              </span>
            )}
          </button>

          {/* Tooltip on hover — appears to the left since badge is on the right */}
          <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-surface text-text border-[3px] border-border shadow-brutal-sm py-1.5 px-2.5 text-[9px] font-mono leading-relaxed whitespace-nowrap">
              <div className="font-bold uppercase text-[7px] tracking-widest text-text-secondary mb-1">Dev Tools</div>
              <div><span className="font-bold">Mode:</span> {import.meta.env.MODE}</div>
              <div><span className="font-bold">UID:</span> {(user?.uid ?? '—').slice(0, 8)}</div>
              <div><span className="font-bold">Theme:</span> {theme} · <span className="font-bold">Lang:</span> {lang}</div>
              {activeCount > 0 && <div><span className="font-bold">Sims:</span> <span className="text-pink">{activeCount} active</span></div>}
              <div className="mt-1 pt-1 border-t border-border text-text-secondary"><kbd className="border border-border px-1 py-0.5 text-[7px] font-bold">Shift+D</kbd> toggle</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dev panel ── */}
      {open && (
        <>
          {/* Overlay for mobile */}
          <div className="fixed inset-0 z-[9998] bg-black/30 sm:hidden" onClick={() => setOpen(false)} />

          <div
            ref={panelRef}
            className="fixed top-14 right-[15%] z-[9999] w-[min(calc(100vw-2rem),400px)] max-h-[80vh] bg-surface border-[3px] border-border shadow-brutal-xl flex flex-col overflow-hidden animate-scale-in print:hidden"
          >
            {/* ── Header ── */}
            <div className="bg-text text-bg px-3 py-2.5 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">⬡</span>
                <span className="text-[10px] font-black uppercase tracking-widest">DevTools</span>
              </div>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <span
                    className="bg-pink text-text border border-current px-1.5 py-0.5 text-[7px] font-bold leading-none cursor-help"
                    title={getActiveLabels(activeKeys).join(' · ')}
                  >
                    {activeCount} active
                  </span>
                )}
                <span className="text-[7px] font-mono opacity-50">{import.meta.env.MODE}</span>
                <button
                  onClick={toggle}
                  className="w-5 h-5 flex items-center justify-center border border-bg/30 text-[10px] leading-none hover:bg-bg/20 transition-colors cursor-pointer"
                  aria-label="Close dev tools"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b-[3px] border-border shrink-0">
              {TABS.map(t => {
                const meta = TAB_META[t]
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider border-r-[3px] border-border last:border-r-0 transition-all duration-100 cursor-pointer flex items-center justify-center gap-1 ${
                      tab === t
                        ? 'bg-yellow text-text shadow-[inset_0_-2px_0_#111]'
                        : 'bg-surface text-text/70 hover:bg-yellow/30 hover:text-text'
                    }`}
                  >
                    <span className="text-[11px] leading-none">{meta.icon}</span>
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {tab === 'triggers' && (
                <div className="p-2.5 space-y-2">
                  <p className="text-[7px] font-bold uppercase tracking-widest text-text-secondary px-1">Debug Actions</p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <DevActionBtn
                      label="SW Update"
                      desc="Simulate service worker update"
                      onClick={handleSimulateSWUpdate}
                      color="yellow"
                    />
                    <DevActionBtn
                      label="Force Error"
                      desc={`Throw test error #${errorCount + 1}`}
                      onClick={handleForceError}
                      color="pink"
                    />
                    <DevActionBtn
                      label={simOffline ? 'Restore Online' : 'Go Offline'}
                      desc={simOffline ? 'Restore navigator.onLine' : 'Override navigator.onLine'}
                      onClick={() => setSimOffline(o => !o)}
                      color="orange"
                      active={simOffline}
                    />
                    <DevActionBtn
                      label="Clear Cache"
                      desc="localStorage.clear() + reload"
                      onClick={handleClearAllCache}
                      color="pink"
                    />
                    <DevActionBtn
                      label="Hard Reload"
                      desc="window.location.reload()"
                      onClick={() => window.location.reload()}
                      color="purple"
                    />
                    <DevActionBtn
                      label="Log Auth"
                      desc="console.log(auth.currentUser)"
                      onClick={() => console.log('auth.currentUser:', user)}
                      color="blue"
                    />
                  </div>

                  <div className="border-[3px] border-border p-2 space-y-1 bg-surface-light">
                    <div className="text-[7px] font-bold uppercase tracking-widest text-text-secondary">Quick Info</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] font-mono leading-relaxed">
                      <div><span className="font-bold text-text">Route:</span> <span className="text-text-secondary">{pathname}</span></div>
                      <div><span className="font-bold text-text">UID:</span> <span className="text-text-secondary">{(user?.uid ?? '—').slice(0, 12)}</span></div>
                      <div><span className="font-bold text-text">Theme:</span> <span className="text-text-secondary">{theme}</span></div>
                      <div><span className="font-bold text-text">Lang:</span> <span className="text-text-secondary">{lang}</span></div>
                      <div><span className="font-bold text-text">Online:</span> <span className="text-text-secondary">{isOnline ? '✅' : '❌'}</span></div>
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
                />
              )}

              {tab === 'state' && (
                <div className="p-2.5 space-y-0.5">
                  {stateVars.map(v => (
                    <VarRow key={v.label} {...v} copied={copied} onCopy={copyToClipboard} />
                  ))}
                </div>
              )}

              {tab === 'vars' && (
                <div className="p-2.5 space-y-1.5">
                  {/* Search */}
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={varSearch}
                      onChange={e => setVarSearch(e.target.value)}
                      placeholder="Filter variables…"
                      className="w-full border-2 border-border bg-surface px-2 py-1.5 text-[9px] font-mono outline-none focus:bg-yellow/20 transition-colors placeholder:text-text-secondary/50"
                    />
                    {varSearch && (
                      <button
                        onClick={() => setVarSearch('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 border border-border px-1 text-[8px] font-bold hover:bg-pink hover:text-text transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="text-[7px] font-mono text-text-secondary px-1">
                    {filteredDebugVars.length} / {debugVars.length} variables
                  </div>
                  <div className="space-y-0.5">
                    {filteredDebugVars.map(v => (
                      <VarRow key={v.label} {...v} copied={copied} onCopy={copyToClipboard} />
                    ))}
                    {filteredDebugVars.length === 0 && (
                      <div className="text-center py-4 text-[9px] font-mono text-text-secondary">No variables match &ldquo;{varSearch}&rdquo;</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="border-t-[3px] border-border px-2.5 py-1.5 flex items-center justify-between shrink-0 bg-surface-light">
              <span className="text-[6px] font-mono text-text-secondary/60">Time Capsules · <kbd className="border border-border px-1">Shift+D</kbd> toggle</span>
              {activeCount > 0 && (
                <button
                  onClick={resetSim}
                  className="text-[7px] font-bold uppercase border border-pink text-pink px-1.5 py-0.5 hover:bg-pink hover:text-text transition-colors cursor-pointer"
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

function ScenariosContent({ sim, updateSim, resetSim, activeCount, spoilerFree, toggleSpoilerFree, swRegRef, handleSimulateSWUpdate, lang, setLang, theme, accent, setTheme, setAccent, activeKeys }: {
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

  return (
    <div className="p-2.5 space-y-3">
      {/* Active simulations banner */}
      {activeCount > 0 && (
        <div className="border-[3px] border-pink bg-pink/10 p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] font-bold uppercase tracking-wider text-pink flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink animate-pulse" />
              {activeCount} active simulation{activeCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={resetSim}
              className="text-[7px] font-bold uppercase border border-pink text-pink px-1.5 py-0.5 hover:bg-pink hover:text-text transition-colors cursor-pointer"
            >
              Reset All
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {getActiveLabels(activeKeys).map(label => (
              <span key={label} className="text-[7px] font-mono bg-pink/20 text-pink border border-pink/40 px-1.5 py-0.5">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 1. User type */}
      <ScenarioSection icon="👤" title="User Type" note="Override hook return values">
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
      <ScenarioSection icon="🌐" title="Network" note="Override latency &amp; failures">
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
      <ScenarioSection icon="❌" title="Error Simulation" note="Intercept next service call">
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
      <ScenarioSection icon="👥" title="Group States" note="Override group service responses">
        <div className="grid grid-cols-2 gap-1.5">
          {groupOptions.map(opt => (
            <button
              key={opt.label}
              onClick={() => updateSim({ groupState: opt.value })}
              className={`text-left border-2 px-2 py-1.5 transition-colors cursor-pointer ${
                sim.groupState === opt.value
                  ? 'bg-purple/30 text-text border-purple'
                  : 'bg-surface text-text border-border hover:bg-purple/15'
              }`}
            >
              <div className="text-[8px] font-bold uppercase leading-tight">{opt.label}</div>
              <div className="text-[6px] font-mono text-text-secondary mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </ScenarioSection>

      {/* 5. Notifications */}
      <ScenarioSection
        icon="🔔"
        title="Test Notifications"
        note={sim.injectedNotifications.length > 0 ? `${sim.injectedNotifications.length} injected` : undefined}
      >
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => injectNotif('upcoming_episode', 'Stranger Things S5E1', 'Airs in 2 days')}
            className="border-[3px] px-2 py-1.5 bg-yellow/15 text-text border-border hover:bg-yellow transition-colors cursor-pointer text-left"
          >
            <span className="text-[8px] font-bold uppercase block">📺 Upcoming Episode</span>
          </button>
          <button
            onClick={() => injectNotif('show_returning', 'The Office returns!', 'Season 8 premieres')}
            className="border-[3px] px-2 py-1.5 bg-blue/15 text-text border-border hover:bg-blue transition-colors cursor-pointer text-left"
          >
            <span className="text-[8px] font-bold uppercase block">🔄 Show Returning</span>
          </button>
        </div>
        {sim.injectedNotifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={clearNotifs}
              className="flex-1 text-[7px] font-bold uppercase border-2 border-pink text-pink px-1.5 py-1 hover:bg-pink hover:text-text transition-colors cursor-pointer"
            >
              Clear ({sim.injectedNotifications.length})
            </button>
            <span className="text-[6px] font-mono text-text-secondary/60">Refresh to see in panel</span>
          </div>
        )}
      </ScenarioSection>

      {/* 6. PWA */}
      <ScenarioSection icon="📦" title="PWA / Service Worker" note="Live SW state">
        <div className="grid grid-cols-2 gap-1.5">
          <DevActionBtn
            label="SW Update"
            desc="Dispatch update event"
            onClick={handleSimulateSWUpdate}
            color="yellow"
          />
          <DevActionBtn
            label="Failed Install"
            desc="Log simulated SW error"
            onClick={() => console.error('[DevTools] Simulated SW install failure')}
            color="pink"
          />
        </div>
        <div className="border-2 border-border bg-surface-light p-1.5">
          <div className="text-[7px] font-bold uppercase mb-1">SW Status</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7px] font-mono text-text-secondary">
            <div><span className="font-bold text-text">State:</span>{' '}
              {swRegRef.current?.active ? <span className="text-green">● active</span>
                : swRegRef.current?.waiting ? <span className="text-yellow">● waiting</span>
                : swRegRef.current?.installing ? <span className="text-blue">● installing</span>
                : <span className="text-text-secondary">○ not registered</span>}
            </div>
            <div><span className="font-bold text-text">Update:</span> {window.__swPendingReload ? '✅ pending' : '—'}</div>
            <div className="col-span-2"><span className="font-bold text-text">Scope:</span> <span className="truncate">{swRegRef.current?.scope ?? '—'}</span></div>
          </div>
        </div>
      </ScenarioSection>

      {/* 7. Locale / Theme / Accent */}
      <ScenarioSection icon="🎨" title="Locale · Theme · Accent" note="Quick toggle">
        <div className="space-y-2.5">
          <ToggleRow label="Language">
            <div className="flex gap-1">
              {(['en', 'es'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`text-[8px] font-bold uppercase border-2 px-2 py-0.5 transition-colors cursor-pointer ${
                    lang === l ? 'bg-yellow text-text border-yellow' : 'bg-surface text-text border-border hover:bg-yellow/30'
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
                  className={`text-[8px] font-bold uppercase border-2 px-2 py-0.5 transition-colors cursor-pointer ${
                    theme === th ? 'bg-text text-bg border-text' : 'bg-surface text-text border-border hover:bg-text hover:text-bg'
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
                  className={`w-5 h-5 border-2 transition-all cursor-pointer ${
                    accent === k ? 'border-border scale-125 ring-1 ring-yellow' : 'border-border/40 hover:scale-110'
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
      <ScenarioSection icon="🙈" title="Spoiler-free Mode" note="Override useSpoilerFree">
        <ScenarioToggle
          label={spoilerFree ? 'Spoiler-free: ON' : 'Spoiler-free: OFF'}
          desc={spoilerFree ? 'Episode details are blurred' : 'All content visible'}
          active={spoilerFree}
          onToggle={() => toggleSpoilerFree(!spoilerFree)}
        />
        {spoilerFree && (
          <div className="border-2 border-border bg-surface-light p-1.5">
            <div className="text-[7px] font-bold uppercase mb-1">Hidden content:</div>
            <ul className="text-[7px] font-mono text-text-secondary space-y-0.5 list-disc list-inside">
              <li>Episode titles &amp; numbers (EpisodeRow)</li>
              <li>Season progress bars (SeasonSection)</li>
              <li>Upcoming air dates (Dashboard)</li>
              <li>Rating inputs (RatingPicker)</li>
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

function ScenarioSection({ icon, title, note, children }: { icon: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="border-[3px] border-border p-2.5 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-sm leading-none">{icon}</span>
          {title}
        </span>
        {note && <span className="text-[6px] font-mono text-text-secondary/60 text-right shrink-0">{note}</span>}
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
      className={`w-full text-left border-2 px-2 py-1.5 transition-colors cursor-pointer ${
        active ? 'bg-yellow/20 text-text border-yellow' : 'bg-surface text-text border-border hover:bg-yellow/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-3.5 h-3.5 border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-yellow border-yellow' : 'border-border'}`}>
          {active && <span className="text-[7px] font-bold text-text">✓</span>}
        </span>
        <div className="min-w-0">
          <div className="text-[8px] font-bold uppercase leading-tight">{label}</div>
          <div className="text-[7px] font-mono text-text-secondary mt-0.5">{desc}</div>
        </div>
      </div>
    </button>
  )
}

function ToggleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[8px] font-bold uppercase text-text-secondary shrink-0">{label}</span>
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
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-bold uppercase">{label}</span>
        <span className={`text-[9px] font-mono tabular-nums ${value > 0 ? 'text-orange font-bold' : 'text-text-secondary'}`}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none bg-border cursor-pointer accent-yellow"
      />
      <div className="flex justify-between text-[6px] font-mono text-text-secondary mt-0.5">
        {markers.map((m, i) => (
          <span key={m} className={value >= markerValues[i] ? 'font-bold text-text' : ''}>{m}</span>
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
    ? 'bg-pink text-text border-pink'
    : 'bg-orange text-text border-orange'
  const hoverStyles = activeColor === 'pink'
    ? 'hover:bg-pink/30'
    : 'hover:bg-orange/30'

  return (
    <div>
      <span className="text-[8px] font-bold uppercase block mb-1">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            className={`text-[7px] font-bold uppercase border-2 px-1.5 py-0.5 transition-colors cursor-pointer ${
              selected === opt.value ? activeStyles : `bg-surface text-text border-border ${hoverStyles}`
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

function VarRow({ label, value, note, copied, onCopy }: DebugVar & { copied: string | null; onCopy: (l: string, v: string) => void }) {
  const display = formatVal(value)
  const valColor = getValueColor(value)

  return (
    <div className="group flex items-start gap-1.5 py-1 px-1 border-b border-border/20 last:border-b-0 hover:bg-yellow/5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-bold uppercase leading-tight flex items-center gap-1.5">
          {label}
          {note && <span className="text-[6px] font-mono text-text-secondary/40 font-normal lowercase">{note}</span>}
        </div>
        <div className={`text-[9px] font-mono break-all leading-tight mt-0.5 ${valColor}`}>{display}</div>
      </div>
      <button
        onClick={() => onCopy(label, String(value ?? ''))}
        className="shrink-0 w-5 h-5 flex items-center justify-center border border-border/40 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-all hover:bg-yellow hover:border-border cursor-pointer"
        aria-label={`Copy ${label}`}
        title="Copy value"
      >
        {copied === label ? <span className="text-green">✓</span> : 'C'}
      </button>
    </div>
  )
}

const COLOR_MAP: Record<string, string> = {
  yellow: 'bg-yellow text-text border-border hover:bg-orange',
  pink: 'bg-pink/20 text-pink border-border hover:bg-pink hover:text-text',
  orange: 'bg-orange/20 text-orange border-border hover:bg-orange hover:text-text',
  purple: 'bg-purple/20 text-purple border-border hover:bg-purple hover:text-text',
  blue: 'bg-blue/20 text-blue border-border hover:bg-blue hover:text-text',
}
const ACTIVE_MAP: Record<string, string> = {
  yellow: 'bg-yellow text-text border-border',
  pink: 'bg-pink text-text border-border',
  orange: 'bg-orange text-text border-border',
  purple: 'bg-purple text-text border-border',
  blue: 'bg-blue text-text border-border',
}

function DevActionBtn({ label, desc, onClick, color, active }: {
  label: string
  desc: string
  onClick: () => void
  color: 'yellow' | 'pink' | 'orange' | 'purple' | 'blue'
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left border-[3px] px-2 py-1.5 transition-all cursor-pointer leading-tight ${
        active ? ACTIVE_MAP[color] : COLOR_MAP[color]
      }`}
    >
      <div className="text-[8px] font-bold uppercase">{label}</div>
      <div className="text-[7px] font-mono text-current/60 mt-0.5 leading-tight">{desc}</div>
    </button>
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
  if (v === null || v === undefined) return 'text-text-secondary/50'
  if (typeof v === 'boolean') return 'text-orange'
  if (typeof v === 'number') return 'text-blue'
  if (typeof v === 'string') {
    if (v.startsWith('http') || v.startsWith('/')) return 'text-green'
    if (v === 'true' || v === 'false') return 'text-orange'
  }
  return 'text-text-secondary'
}
