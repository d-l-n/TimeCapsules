import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import en from '../i18n/en'
import es from '../i18n/es'

export type Lang = 'en' | 'es'
type Translations = typeof en

const bundles: Record<Lang, Translations> = { en, es }

interface I18nCtx {
  lang: Lang
  t: Translations
  setLang: (l: Lang) => void
}

const I18nContext = createContext<I18nCtx>(null!)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('timecapsules-lang')
    if (stored === 'en' || stored === 'es') return stored
    return navigator.language.startsWith('es') ? 'es' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('timecapsules-lang', lang)
  }, [lang])

  const t = bundles[lang]
  const setLang = (l: Lang) => setLangState(l)

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => useContext(I18nContext)
