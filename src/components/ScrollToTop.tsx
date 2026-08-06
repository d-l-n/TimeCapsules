import { useState, useEffect } from 'react'
import { useI18n } from '../lib/I18nContext'

export default function ScrollToTop() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      className="btn-square !fixed right-4 z-40 w-10 h-10 border-[3px] border-border bg-surface text-text sm:hover:bg-yellow transition-colors flex items-center justify-center text-lg font-bold bottom-24 max-sm:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
      aria-label={t.nav.scrollToTop}
    >
      ↑
    </button>
  )
}
