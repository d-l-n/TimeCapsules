import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/I18nContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

export default function InstallBanner() {
  const { t } = useI18n()
  const [show, setShow] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    const handler = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent
      installEvent.preventDefault()
      deferredPrompt.current = installEvent
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt()
      deferredPrompt.current = null
    }
    setShow(false)
  }, [])

  const handleDismiss = useCallback(() => {
    setShow(false)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t-4 border-border bg-surface">
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
          className="border-[3px] border-border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-yellow text-text sm:hover:bg-pink transition-colors shrink-0 uppercase"
        >
          {t.install.btn}
        </button>
        <button
          onClick={handleDismiss}
          aria-label={t.install.dismiss}
          className="border-2 border-border px-2 py-1.5 text-[10px] sm:text-xs font-bold bg-surface text-text sm:hover:bg-yellow transition-colors shrink-0 uppercase"
        >
          {t.install.dismiss}
        </button>
      </div>
    </div>
  )
}
