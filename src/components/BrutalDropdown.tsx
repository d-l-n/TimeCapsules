import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface BrutalDropdownProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
  buttonClassName?: string
  className?: string
}

export default function BrutalDropdown({ value, options, onChange, placeholder, ariaLabel, buttonClassName = '', className = '' }: BrutalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setIsOpen(false)
    setFocusedIdx(-1)
  }, [])

  const all = useMemo(
    () => placeholder ? [{ value: '', label: placeholder }, ...options] : options,
    [placeholder, options]
  )

  useEffect(() => {
    if (!isOpen) return
    setFocusedIdx(-1)
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, close])

  const selectIdx = useCallback((idx: number) => {
    if (idx < 0 || idx >= all.length) return
    onChange(all[idx].value)
    close()
  }, [all, onChange, close])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          close()
          btnRef.current?.focus()
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIdx(prev => Math.min(prev + 1, all.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIdx(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIdx >= 0) selectIdx(focusedIdx)
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, focusedIdx, all.length, selectIdx, close])

  const selectedOption = options.find(o => o.value === value)
  const displayText = selectedOption?.label || placeholder || ''
  const hasValue = options.some(o => o.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={btnRef}
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setIsOpen(true)
          }
        }}
        className={`border-2 border-border bg-surface font-bold uppercase cursor-pointer sm:hover:bg-yellow transition-all text-left w-full flex items-center justify-between gap-2 ${buttonClassName}`}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={`truncate ${!hasValue ? 'text-text-secondary' : ''}`}>{displayText}</span>
        <span className="text-[10px] font-bold shrink-0">▼</span>
      </button>
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 bg-surface border-[3px] border-border z-50 min-w-full max-h-60 overflow-y-auto shadow-brutal-md"
        >
          {all.map((opt, idx) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => selectIdx(idx)}
              onMouseEnter={() => setFocusedIdx(idx)}
              className={`w-full text-left px-3 py-2 text-xs font-bold border-b-2 border-border last:border-b-0 transition-colors cursor-pointer uppercase ${
                focusedIdx === idx ? 'bg-yellow text-text' : opt.value === value ? 'bg-yellow/50 text-text' : 'sm:hover:bg-yellow'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
