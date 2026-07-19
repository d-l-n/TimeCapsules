import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nProvider, useI18n } from './I18nContext'

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('I18nContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('useI18n', () => {
    it('provides default english language', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })
      expect(result.current.lang).toBe('en')
    })

    it('provides translations in english by default', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })
      expect(result.current.t.app.name).toBe('TIME CAPSULES')
      expect(result.current.t.nav.dashboard).toBe('Dashboard')
      expect(result.current.t.auth.signIn).toBe('SIGN IN')
    })

    it('restores language from localStorage', () => {
      localStorage.setItem('timecapsules-lang', 'es')
      const { result } = renderHook(() => useI18n(), { wrapper })
      expect(result.current.lang).toBe('es')
    })

    it('provides spanish translations when lang is es', () => {
      localStorage.setItem('timecapsules-lang', 'es')
      const { result } = renderHook(() => useI18n(), { wrapper })
      expect(result.current.t.nav.dashboard).toBe('Inicio')
      expect(result.current.t.auth.signIn).toBe('INICIAR SESIÓN')
    })

    it('switches language', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })
      act(() => result.current.setLang('es'))
      expect(result.current.lang).toBe('es')
      expect(result.current.t.nav.dashboard).toBe('Inicio')
    })

    it('persists language to localStorage', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })
      act(() => result.current.setLang('es'))
      expect(localStorage.getItem('timecapsules-lang')).toBe('es')
    })

    it('switches back to english', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })
      act(() => result.current.setLang('es'))
      act(() => result.current.setLang('en'))
      expect(result.current.lang).toBe('en')
      expect(result.current.t.nav.dashboard).toBe('Dashboard')
    })
  })
})
