import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

const ACCENT_PRESETS = {
  lime: '#ccff00',
  pink: '#ff2d78',
  cyan: '#00e5ff',
  orange: '#ff9100',
  purple: '#b388ff',
} as const

type AccentKey = keyof typeof ACCENT_PRESETS

interface ThemeCtx {
  theme: Theme
  accent: AccentKey
  accentHex: string
  toggle: () => void
  setTheme: (t: Theme) => void
  setAccent: (a: AccentKey) => void
}

const ThemeContext = createContext<ThemeCtx>(null!)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('timecapsules-theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [accent, setAccentState] = useState<AccentKey>(() => {
    const stored = localStorage.getItem('timecapsules-accent')
    if (stored && stored in ACCENT_PRESETS) return stored as AccentKey
    return 'lime'
  })

  const accentHex = ACCENT_PRESETS[accent]

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('timecapsules-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#f5f0eb')
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentHex)
    document.documentElement.style.setProperty('--color-accent-border', theme === 'dark' ? accentHex : '#0a0a0a')
    localStorage.setItem('timecapsules-accent', accent)
  }, [accent, accentHex, theme])

  const toggle = () => setThemeState(t => t === 'light' ? 'dark' : 'light')
  const setTheme = (t: Theme) => setThemeState(t)
  const setAccent = (a: AccentKey) => setAccentState(a)

  return <ThemeContext.Provider value={{ theme, accent, accentHex, toggle, setTheme, setAccent }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
export { ACCENT_PRESETS }
export type { AccentKey }
