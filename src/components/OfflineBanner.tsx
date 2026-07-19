import { useOnlineStatus } from '../hooks'
import { useI18n } from '../lib/I18nContext'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { t } = useI18n()

  if (isOnline) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-highlight text-text border-b-4 border-border px-4 py-2 text-center text-xs font-bold uppercase"
      role="status"
    >
      {t.offline.title} — {t.offline.desc}
    </div>
  )
}
