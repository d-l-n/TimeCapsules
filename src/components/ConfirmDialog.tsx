import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel: string
  confirmAction: () => void
  cancelLabel?: string
  variant?: 'default' | 'danger'
  error?: string | null
  disabled?: boolean
}

export default function ConfirmDialog({ open, onClose, title, message, confirmLabel, confirmAction, cancelLabel, variant = 'default', error, disabled }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el.addEventListener('cancel', handler)
    return () => el.removeEventListener('cancel', handler)
  }, [onClose])

  return (
    <dialog ref={ref} onClose={onClose}>
      <div className="bg-surface border-[3px] border-border max-w-sm w-full mx-auto p-6 shadow-brutal-xl space-y-6">
        <h3 className="text-lg font-heading uppercase border-b-4 border-border pb-3">{title}</h3>
        <p className={`text-sm font-bold ${variant === 'danger' ? 'text-pink' : ''}`}>{message}</p>
        {error && (
          <div className="border-[3px] border-border bg-pink/10 text-pink px-3 py-2 text-[10px] font-bold uppercase">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            onClick={confirmAction}
            disabled={disabled}
            className={`flex-1 border-[3px] border-border px-4 py-3 text-sm font-bold uppercase transition-colors disabled:opacity-50 cursor-pointer ${variant === 'danger' ? 'bg-pink text-text sm:hover:bg-text sm:hover:text-pink' : 'bg-yellow text-text sm:hover:bg-pink'}`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={disabled}
            className="flex-1 border-[3px] border-border bg-surface text-text px-4 py-3 text-sm font-bold uppercase sm:hover:bg-yellow transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel || 'Cancel'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
