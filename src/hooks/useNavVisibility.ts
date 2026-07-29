import { useEffect, useRef, useState } from 'react'

export function useNavVisibility({ showNotifPanel = false }: { showNotifPanel?: boolean } = {}) {
  const [navHiddenByScroll, setNavHiddenByScroll] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (showNotifPanel) {
      setNavHiddenByScroll(false)
      return
    }
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY > lastScrollY.current && currentY > 50) {
        setNavHiddenByScroll(true)
      } else if (currentY < lastScrollY.current) {
        setNavHiddenByScroll(false)
      }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showNotifPanel])

  return { navHiddenByScroll }
}
