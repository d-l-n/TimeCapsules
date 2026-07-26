import { useEffect, useState } from 'react'
import { useI18n } from '../lib/I18nContext'

export default function ReloadButton() {
  const [updateReady, setUpdateReady] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [complete, setComplete] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true)
    const onComplete = () => setComplete(true)
    window.addEventListener('sw-update-available', onUpdate)
    window.addEventListener('sw-update-complete', onComplete)
    return () => {
      window.removeEventListener('sw-update-available', onUpdate)
      window.removeEventListener('sw-update-complete', onComplete)
    }
  }, [])

  const handleClick = () => {
    if (updating || complete) return
    setUpdating(true)
    window.__swPendingReload = true
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        window.__swReloadTimer = window.setTimeout(() => window.location.reload(), 2000)
      } else {
        window.location.reload()
      }
    }).catch(err => {
      console.error('[SW Update] Failed to activate new service worker:', err)
      window.location.reload()
    })
  }

  if (!updateReady) return null

  return (
    <button
      onClick={handleClick}
      disabled={updating || complete}
      aria-label={complete ? t.install.updated : updating ? t.install.updating : t.install.update}
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] border-[3px] px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all shadow-brutal ${complete
        ? 'border-yellow bg-yellow text-text cursor-default'
        : updating
          ? 'border-border bg-yellow/50 text-text/70 animate-pulse cursor-wait'
          : 'border-yellow bg-surface text-text animate-pulse-green sm:hover:bg-yellow cursor-pointer'
      }`}
      style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}
    >
      {complete ? t.install.updated : updating ? t.install.updating : t.install.update}
    </button>
  )
}
