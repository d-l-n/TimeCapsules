import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider, useTheme, ACCENT_PRESETS } from './ThemeContext'

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.removeProperty('--color-accent')
    document.documentElement.style.removeProperty('--color-accent-border')
  })

  describe('useTheme', () => {
    it('provides default light theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      expect(result.current.theme).toBe('light')
    })

    it('restores theme from localStorage', () => {
      localStorage.setItem('timecapsules-theme', 'dark')
      const { result } = renderHook(() => useTheme(), { wrapper })
      expect(result.current.theme).toBe('dark')
    })

    it('ignores invalid stored theme value and defaults to light', () => {
      localStorage.setItem('timecapsules-theme', 'solarized')
      const { result } = renderHook(() => useTheme(), { wrapper })
      expect(result.current.theme).toBe('light')
    })

    it('toggles theme between light and dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      act(() => result.current.toggle())
      expect(result.current.theme).toBe('dark')
      act(() => result.current.toggle())
      expect(result.current.theme).toBe('light')
    })

    it('persists theme to localStorage after toggle', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      act(() => result.current.toggle())
      expect(localStorage.getItem('timecapsules-theme')).toBe('dark')
    })

    it('sets theme explicitly', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      act(() => result.current.setTheme('dark'))
      expect(result.current.theme).toBe('dark')
    })

    it('sets data-theme attribute on document element', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      act(() => result.current.setTheme('dark'))
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('provides default accent color', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      expect(result.current.accent).toBe('lime')
    })

    it('returns correct accentHex for default lime', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      expect(result.current.accentHex).toBe(ACCENT_PRESETS.lime)
    })

    it('restores accent from localStorage', () => {
      localStorage.setItem('timecapsules-accent', 'pink')
      const { result } = renderHook(() => useTheme(), { wrapper })
      expect(result.current.accent).toBe('pink')
    })

    it('ignores invalid stored accent and defaults to lime', () => {
      localStorage.setItem('timecapsules-accent', 'invalid_color')
      const { result } = renderHook(() => useTheme(), { wrapper })
      expect(result.current.accent).toBe('lime')
    })

    it('sets accent color', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      act(() => result.current.setAccent('purple'))
      expect(result.current.accent).toBe('purple')
      expect(result.current.accentHex).toBe(ACCENT_PRESETS.purple)
    })

    it('persists accent to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      act(() => result.current.setAccent('cyan'))
      expect(localStorage.getItem('timecapsules-accent')).toBe('cyan')
    })

    it('sets --color-accent CSS variable', () => {
      const { result } = renderHook(() => useTheme(), { wrapper })
      act(() => result.current.setAccent('orange'))
      expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe(ACCENT_PRESETS.orange)
    })
  })

  describe('ACCENT_PRESETS', () => {
    it('defines 5 accent colors', () => {
      expect(Object.keys(ACCENT_PRESETS)).toHaveLength(5)
    })

    it('has all required keys', () => {
      expect(ACCENT_PRESETS).toHaveProperty('lime')
      expect(ACCENT_PRESETS).toHaveProperty('pink')
      expect(ACCENT_PRESETS).toHaveProperty('cyan')
      expect(ACCENT_PRESETS).toHaveProperty('orange')
      expect(ACCENT_PRESETS).toHaveProperty('purple')
    })

    it('has valid color hex values', () => {
      for (const color of Object.values(ACCENT_PRESETS)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })
})

