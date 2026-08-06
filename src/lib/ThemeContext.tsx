import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

const ACCENT_PRESETS = {
  yellow: '#FFD400',
  blue: '#4D7CFE',
  green: '#76E56F',
  pink: '#FF5CA8',
  orange: '#FF8A00',
  purple: '#A855F7',
  red: '#FF4A4A',
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
    return 'yellow'
  })

  const accentHex = ACCENT_PRESETS[accent]

  useEffect(() => {
    // Apply theme instantly — no transition (avoids CLS/jank from animating colors)
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('timecapsules-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f0f0f' : '#F6F6F3')
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentHex)
    document.documentElement.style.setProperty('--color-accent-border', theme === 'dark' ? '#f0f0f0' : '#111111')
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
