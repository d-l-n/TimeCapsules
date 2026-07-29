import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/I18nContext'
import ErrorBox from '../components/ErrorBox'

export default function LoginPage() {
  const { loginGoogle, loginEmail, registerEmail } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  async function go(fn: () => Promise<void>) {
    setError(''); setBusy(true)
    try { await fn(); nav('/dashboard') } catch (e) { setError((e as Error).message) }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border-[3px] border-border p-8 shadow-brutal">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-2xl font-black leading-none font-heading">TC</span>
        </div>
        <h1 className="text-3xl font-black uppercase text-center mb-2 font-heading">
          {t.app.name}
        </h1>
        <p className="text-xs text-text-secondary text-center mb-8 border-b-[3px] border-border pb-4" id="form-description">
          {mode === 'login' ? t.auth.signInToContinue : t.auth.createAccount}
        </p>

        {error && <ErrorBox message={error} className="mb-4" />}

        <button
          onClick={() => go(loginGoogle)}
          disabled={busy}
          className="w-full border-[3px] border-border bg-surface px-4 py-3 text-sm font-bold uppercase sm:hover:bg-yellow transition-colors disabled:opacity-50 mb-3 flex items-center justify-center gap-2 shadow-brutal-sm"
          aria-label="Sign in with Google"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {t.auth.signInWithGoogle}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t-4 border-border"></div></div>
          <div className="relative flex justify-center"><span className="bg-surface px-3 text-xs font-bold uppercase text-text-secondary">{t.auth.or}</span></div>
        </div>

        <form onSubmit={e => { e.preventDefault(); go(() => mode === 'login' ? loginEmail(email, password) : registerEmail(email, password)) }} aria-describedby="form-description">
          <label htmlFor="login-email" className="sr-only">{t.auth.email}</label>
          <input
            id="login-email"
            name="email"
            type="email" placeholder={t.auth.email} value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border-[3px] border-border px-3 py-2.5 text-sm font-bold bg-surface mb-3 outline-none focus:bg-yellow/30 transition-colors"
            required autoComplete="email" spellCheck={false} autoCapitalize="none"
          />
          <label htmlFor="login-password" className="sr-only">{t.auth.password}</label>
          <input
            id="login-password"
            type="password" placeholder={t.auth.password} value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border-[3px] border-border px-3 py-2.5 text-sm font-bold bg-surface mb-4 outline-none focus:bg-yellow/30 transition-colors"
            required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button type="submit" disabled={busy} className="w-full border-[3px] border-border bg-yellow text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-orange transition-colors disabled:opacity-50 shadow-brutal-sm" aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
            {mode === 'login' ? t.auth.signIn : t.auth.createAccount}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          className="w-full text-center text-xs font-bold uppercase mt-3 underline sm:hover:text-pink transition-colors"
          aria-label={mode === 'login' ? 'Switch to create account' : 'Switch to sign in'}
        >
          {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}
        </button>

      </div>
    </div>
  )
}
