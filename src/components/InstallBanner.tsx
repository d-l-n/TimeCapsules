import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/I18nContext'

type InstallMode = 'android' | 'ios'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

const DISMISSED_KEY = 'tc_install_dismissed'
const DISMISS_LATER_KEY = 'tc_install_dismissed_later'
const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000
const DISMISS_LATER_TTL = 24 * 60 * 60 * 1000

export default function InstallBanner() {
  const { t } = useI18n()
  const [mode, setMode] = useState<InstallMode | null>(null)
  const [hiding, setHiding] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Force-show from DevTools
  useEffect(() => {
    const forceHandler = () => {
      localStorage.removeItem(DISMISSED_KEY)
      localStorage.removeItem(DISMISS_LATER_KEY)
      if (showTimer.current) clearTimeout(showTimer.current)
      setMode('android')
    }
    window.addEventListener('force-install-banner', forceHandler)
    return () => window.removeEventListener('force-install-banner', forceHandler)
  }, [])

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) {
      const ts = parseInt(dismissed, 10)
      if (!isNaN(ts) && Date.now() - ts < DISMISS_TTL) return
      localStorage.removeItem(DISMISSED_KEY)
    }
    const later = localStorage.getItem(DISMISS_LATER_KEY)
    if (later) {
      const ts = parseInt(later, 10)
      if (!isNaN(ts) && Date.now() - ts < DISMISS_LATER_TTL) return
      localStorage.removeItem(DISMISS_LATER_KEY)
    }

    if (window.matchMedia('(display-mode: standalone)').matches) return
    const iosNav = navigator as Navigator & { standalone?: boolean }
    if (iosNav.standalone) return

    const handler = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent
      installEvent.preventDefault()
      deferredPrompt.current = installEvent
      showTimer.current = setTimeout(() => setMode('android'), 3500)
    }

    window.addEventListener('beforeinstallprompt', handler)

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      /safari/i.test(navigator.userAgent) &&
      !/crios|fxios|opios/i.test(navigator.userAgent)

    if (isIos) {
      showTimer.current = setTimeout(() => setMode('ios'), 3500)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (showTimer.current) clearTimeout(showTimer.current)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  const dismiss = (later = false) => {
    setHiding(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setMode(null)
      setHiding(false)
      hideTimer.current = null
    }, 300)
    localStorage.setItem(later ? DISMISS_LATER_KEY : DISMISSED_KEY, String(Date.now()))
  }

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt()
      const { outcome } = await deferredPrompt.current.userChoice
      if (outcome === 'accepted') {
        setHiding(true)
        setTimeout(() => { setMode(null); setHiding(false) }, 300)
      }
      deferredPrompt.current = null
    } else {
      // No native prompt (forced via DevTools) — just dismiss
      if (showTimer.current) clearTimeout(showTimer.current)
      setHiding(true)
      setTimeout(() => { setMode(null); setHiding(false) }, 300)
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    }
  }

  if (!mode) return null

  if (mode === 'ios') {
    return (
      <div className={`fixed bottom-24 left-4 right-4 z-30 transition-opacity duration-300 ${hiding ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-surface border-[3px] border-border p-4 relative shadow-brutal-sm">
          <button
            onClick={() => dismiss()}
            className="x-btn absolute -top-3 -right-3 border-2 border-border bg-surface text-text w-7 h-7 flex items-center justify-center text-xs font-bold sm:hover:bg-yellow"
            aria-label="Close"
          >
            X
          </button>
          <div className="text-xs font-bold uppercase mb-2">{t.install.title}</div>
          <div className="text-xs leading-relaxed">
            {t.install.iosInstructions}
          </div>
          <div className="absolute -bottom-2 left-6 w-4 h-4 bg-surface border-r-4 border-b-4 border-border rotate-45" />
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 border-t-4 border-border bg-surface transition-transform duration-300 ${hiding ? 'translate-y-full' : 'translate-y-0'}`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-bold uppercase truncate">
            {t.install.title}
          </div>
          <div className="text-[10px] sm:text-xs text-text-secondary mt-0.5">
            {t.install.desc.replace('{name}', t.app.name)}
          </div>
        </div>
        <button
          onClick={handleInstall}
          aria-label={t.install.btn}
          className="border-[3px] border-border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-yellow text-text sm:hover:bg-pink sm:hover:text-text transition-colors shrink-0 uppercase"
        >
          {t.install.btn}
        </button>
        <button
          onClick={() => dismiss(true)}
          aria-label={t.install.later}
          className="border-2 border-border px-2 py-1.5 text-[10px] sm:text-xs font-bold bg-surface text-text sm:hover:bg-yellow transition-colors shrink-0 uppercase"
        >
          {t.install.later}
        </button>
        <button
          onClick={() => dismiss()}
          aria-label={t.install.dismiss}
          className="border-2 border-border px-2 py-1.5 text-[10px] sm:text-xs font-bold bg-surface text-text sm:hover:bg-pink transition-colors shrink-0 uppercase"
        >
          {t.install.dismiss}
        </button>
      </div>
    </div>
  )
}
