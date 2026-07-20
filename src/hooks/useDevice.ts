import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768
const SIDEBAR_BREAKPOINT = 1100

export function useDevice() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth < SIDEBAR_BREAKPOINT)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SIDEBAR_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsSidebarCollapsed(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return { isMobile, isDesktop: !isMobile, isSidebarCollapsed }
}
