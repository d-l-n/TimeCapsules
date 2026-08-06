import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import * as QRCode from 'qrcode'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import { getDeviceInfo } from '../lib/deviceInfo'
import { createPairing, pollPairing } from '../lib/pairingClient'

type Phase = 'creating' | 'ready' | 'signing' | 'expired' | 'error'

export default function QrLoginPage() {
  const { user, loading, loginWithCustomToken } = useAuth()
  const { t } = useI18n()
  const nav = useNavigate()
  const started = useRef(false)
  const [phase, setPhase] = useState<Phase>('creating')
  const [qrUrl, setQrUrl] = useState('')
  const [pairId, setPairId] = useState('')

  async function start() {
    setPhase('creating')
    try {
      const { id } = await createPairing(getDeviceInfo())
      setPairId(id)
      const url = `${window.location.origin}/pair?code=${id}`
      const dataUrl = await QRCode.toDataURL(url, {
        width: 260,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0a0a0a', light: '#ffffff' },
      })
      setQrUrl(dataUrl)
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'ready' || !pairId) return
    let stopped = false
    let timer: number | undefined
    const tick = async () => {
      try {
        const res = await pollPairing(pairId)
        if (stopped) return
        if (res.status === 'done' && res.customToken) {
          stopped = true
          setPhase('signing')
          try {
            await loginWithCustomToken(res.customToken)
            nav('/dashboard')
          } catch {
            setPhase('error')
          }
        } else if (res.status === 'expired' || res.status === 'not_found') {
          stopped = true
          setPhase('expired')
        } else {
          timer = window.setTimeout(tick, 1500)
        }
      } catch {
        if (!stopped) timer = window.setTimeout(tick, 3000)
      }
    }
    void tick()
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [phase, pairId, loginWithCustomToken, nav])

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />

  const busy = phase === 'creating' || phase === 'signing'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border-[3px] border-border p-6 sm:p-8 shadow-brutal">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-2xl font-black leading-none font-heading">TC</span>
        </div>
        <h1 className="text-2xl font-black uppercase text-center mb-1 font-heading">{t.app.name}</h1>
        <p className="text-xs font-bold uppercase text-center mb-6 border-b-[3px] border-border pb-4 text-text-secondary">
          {t.qr.scanTitle}
        </p>

        <ol className="space-y-2 mb-6 text-xs font-bold text-text-secondary">
          <li>{t.qr.step1}</li>
          <li>{t.qr.step2}</li>
          <li>{t.qr.step3}</li>
        </ol>

        <div className="flex justify-center mb-4">
          {busy ? (
            <div className="w-56 h-56 border-[3px] border-border bg-bg/60 flex items-center justify-center">
              <span className="border-4 border-border border-t-yellow w-8 h-8 animate-spin" />
            </div>
          ) : phase === 'expired' ? (
            <div className="w-56 h-56 border-[3px] border-border bg-bg/60 flex flex-col items-center justify-center gap-2 p-4">
              <span className="text-3xl">✕</span>
              <span className="text-xs font-bold uppercase text-center">{t.qr.expired}</span>
            </div>
          ) : phase === 'error' ? (
            <div className="w-56 h-56 border-[3px] border-border bg-bg/60 flex flex-col items-center justify-center gap-2 p-4">
              <span className="text-3xl">!</span>
              <span className="text-xs font-bold uppercase text-center">{t.qr.error}</span>
            </div>
          ) : (
            <div className="bg-white p-3 border-[3px] border-border shadow-brutal-sm">
              <img src={qrUrl} alt={t.qr.qrAlt} className="w-52 h-52" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`border-2 border-border w-3 h-3 ${phase === 'ready' ? 'bg-yellow animate-pulse' : ''}`} />
          <span className="text-xs font-bold uppercase text-text-secondary">
            {phase === 'ready' && t.qr.waiting}
            {phase === 'creating' && t.qr.waiting}
            {phase === 'signing' && t.qr.signingIn}
            {phase === 'expired' && t.qr.expiredDesc}
            {phase === 'error' && t.qr.error}
          </span>
        </div>

        <button
          onClick={() => void start()}
          className="w-full border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-orange transition-colors shadow-brutal-sm mb-3"
        >
          {t.qr.newQr}
        </button>
        <Link
          to="/login"
          className="block w-full text-center text-xs font-bold uppercase underline sm:hover:text-pink transition-colors"
        >
          {t.qr.backToLogin}
        </Link>
      </div>
    </div>
  )
}
