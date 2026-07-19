import { useState, useCallback } from 'react'

const KEY = 'spoilerFree'

export function useSpoilerFree(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) === 'true')
  const toggle = useCallback((v: boolean) => { setEnabled(v); localStorage.setItem(KEY, String(v)) }, [])
  return [enabled, toggle]
}
