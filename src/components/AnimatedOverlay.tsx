import { useState, useEffect, useRef, type ReactNode } from 'react'

interface AnimatedOverlayProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  ariaLabel?: string
  /** Duration in ms for the close animation before unmounting */
  closeDuration?: number
}

export default function AnimatedOverlay({
  open,
  onClose,
  children,
  className = '',
  ariaLabel,
  closeDuration = 150,
}: AnimatedOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // Double rAF ensures DOM paints before entrance animation triggers
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(raf)
    } else if (mounted) {
      setVisible(false)
      timerRef.current = setTimeout(() => setMounted(false), closeDuration)
      return () => clearTimeout(timerRef.current)
    }
  }, [open, closeDuration])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  // Auto-focus the dialog when it becomes visible
  useEffect(() => {
    if (visible && overlayRef.current) {
      // Don't steal focus from a child with autoFocus (e.g. reauth password input)
      if (!overlayRef.current.contains(document.activeElement)) {
        overlayRef.current.focus()
      }
    }
  }, [visible])

  if (!mounted) return null

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg/80 ${visible ? 'animate-fade-in' : 'animate-fade-out'} ${className}`}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={visible ? 'animate-scale-in' : ''}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
