import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { confirmPairing, pollPairing, type DeviceInfo } from '../lib/pairingClient'

type Phase = 'idle' | 'confirming' | 'done' | 'error'

export default function QrConfirmPage() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const code = params.get('code') ?? ''
  const confirmed = useRef(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [requestor, setRequestor] = useState<DeviceInfo | null>(null)

  async function confirm() {
    if (!code || !user || confirmed.current) return
    confirmed.current = true
    setPhase('confirming')
    try {
      const idToken = await user.getIdToken()
      await confirmPairing(code, idToken)
      setPhase('done')
    } catch {
      confirmed.current = false
      setPhase('error')
    }
  }

  useEffect(() => {
    if (!code || !user?.uid) return
    let cancelled = false
    pollPairing(code)
      .then(res => { if (!cancelled && res.status === 'pending' && res.device) setRequestor(res.device) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [code, user?.uid])

  useEffect(() => {
    if (!code || !user) return
    void confirm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, user?.uid])

  if (loading) return null

  const shell = (children: ReactNode) => (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border-[3px] border-border p-6 sm:p-8 shadow-brutal">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-2xl font-black leading-none font-heading">TC</span>
        </div>
        {children}
      </div>
    </div>
  )

  if (!code) {
    return shell(
      <>
        <h1 className="text-2xl font-black uppercase text-center mb-2 font-heading">{t.qr.invalidCode}</h1>
        <p className="text-xs text-text-secondary text-center mb-6">{t.qr.invalidCodeDesc}</p>
        <Link to="/" className="block w-full text-center text-xs font-bold uppercase underline sm:hover:text-pink transition-colors">
          {t.qr.backToLogin}
        </Link>
      </>,
    )
  }

  if (!user) {
    return shell(
      <>
        <h1 className="text-2xl font-black uppercase text-center mb-2 font-heading">{t.qr.noSession}</h1>
        <p className="text-xs text-text-secondary text-center mb-6 border-b-[3px] border-border pb-4">{t.qr.noSessionDesc}</p>
        <Link
          to="/login"
          className="block w-full border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase text-center sm:hover:bg-orange transition-colors shadow-brutal-sm mb-3"
        >
          {t.qr.goLogin}
        </Link>
      </>,
    )
  }

  if (phase === 'done') {
    return shell(
      <>
        <div className="text-center text-4xl mb-3">✓</div>
        <h1 className="text-2xl font-black uppercase text-center mb-2 font-heading">{t.qr.done}</h1>
        <p className="text-xs text-text-secondary text-center mb-6 border-b-[3px] border-border pb-4">{t.qr.doneDesc}</p>
        <button
          onClick={() => nav('/')}
          className="w-full border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-orange transition-colors shadow-brutal-sm"
        >
          {t.qr.closeBtn}
        </button>
      </>,
    )
  }

  const displayName = user.displayName || user.email || t.profile.user
  const initial = (displayName || '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border-[3px] border-border p-6 sm:p-8 shadow-brutal">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-2xl font-black leading-none font-heading">TC</span>
        </div>
        <h1 className="text-xl font-black uppercase text-center mb-4 font-heading">{t.qr.confirmTitle}</h1>

        <div className="border-[3px] border-yellow bg-yellow/10 p-3 mb-4">
          <p className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t.qr.requestFrom}</p>
          <p className="text-sm font-black uppercase leading-tight">
            {requestor
              ? `${({ tablet: t.qr.tablet, mobile: t.qr.phone, desktop: t.qr.desktop })[requestor.type]} · ${requestor.browser} · ${requestor.os}`
              : t.qr.unknownDevice}
          </p>
        </div>

        <div className="flex items-center gap-3 border-[3px] border-border p-3 mb-4 bg-bg/40">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-10 h-10 border-2 border-border bg-surface object-cover" />
          ) : (
            <span className="w-10 h-10 border-2 border-border bg-yellow text-text font-black flex items-center justify-center">{initial}</span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-black uppercase truncate">{displayName}</p>
            <p className="text-[10px] font-bold text-text-secondary truncate">{user.email}</p>
          </div>
        </div>

        <p className="text-xs text-text-secondary mb-6 border-b-[3px] border-border pb-4">{t.qr.confirmDesc}</p>

        {phase === 'error' && (
          <p className="text-[10px] font-bold uppercase text-pink mb-3">{t.qr.error}</p>
        )}

        <button
          onClick={() => void confirm()}
          disabled={phase === 'confirming'}
          className="w-full border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-orange transition-colors disabled:opacity-50 shadow-brutal-sm mb-3"
        >
          {phase === 'confirming' ? t.qr.confirming : t.qr.confirmBtn}
        </button>
        <button
          onClick={() => nav('/')}
          disabled={phase === 'confirming'}
          className="w-full text-center text-xs font-bold uppercase underline sm:hover:text-pink transition-colors disabled:opacity-50"
        >
          {t.qr.cancelBtn}
        </button>
      </div>
    </div>
  )
}
