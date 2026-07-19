import { describe, it, expect } from 'vitest'
import en from './en'
import es from './es'

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('i18n key parity', () => {
  const enKeys = flattenKeys(en)
  const esKeys = flattenKeys(es)

  it('en and es have the same number of keys', () => {
    expect(enKeys.length).toBe(esKeys.length)
  })

  it('all en keys exist in es', () => {
    for (const key of enKeys) {
      expect(esKeys).toContain(key)
    }
  })

  it('all es keys exist in en', () => {
    for (const key of esKeys) {
      expect(enKeys).toContain(key)
    }
  })
})

describe('i18n structure', () => {
  it('has all required top-level sections in both languages', () => {
    const sections = ['app', 'nav', 'auth', 'dashboard', 'history', 'stats', 'showDetail', 'settings', 'calendar', 'discover']
    for (const section of sections) {
      expect(en).toHaveProperty(section)
      expect(es).toHaveProperty(section)
    }
  })

  it('has non-empty app name', () => {
    expect(en.app.name).toBeTruthy()
    expect(es.app.name).toBeTruthy()
  })

  it('has 12 months in calendar for both languages', () => {
    expect(en.calendar.months).toHaveLength(12)
    expect(es.calendar.months).toHaveLength(12)
  })

  it('has 7 weekdays in calendar for both languages', () => {
    expect(en.calendar.weekdays).toHaveLength(7)
    expect(es.calendar.weekdays).toHaveLength(7)
  })

  it('has no empty string values in english translations', () => {
    function checkNoEmpty(obj: Record<string, unknown>, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const full = `${path}${key}`
        if (Array.isArray(value)) {
          value.forEach((v, i) => expect(v, `${full}[${i}] is empty`).toBeTruthy())
        } else if (typeof value === 'object' && value !== null) {
          checkNoEmpty(value as Record<string, unknown>, `${full}.`)
        } else {
          expect(typeof value === 'string' ? value.length : 1, `${full} is empty`).toBeGreaterThan(0)
        }
      }
    }
    checkNoEmpty(en)
  })
})
