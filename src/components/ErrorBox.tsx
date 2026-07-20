import type { ReactNode } from 'react'

interface ErrorBoxProps {
  message: ReactNode
  title?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function AlertIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" aria-hidden="true">
      <path d="M12 2 1 21h22L12 2z" />
      <path d="M12 9v5" />
      <path d="M12 17.5v.01" />
    </svg>
  )
}

export default function ErrorBox({ message, title, onRetry, retryLabel, className = '' }: ErrorBoxProps) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={`border-[3px] border-pink bg-pink/10 text-pink p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          {title && <p className="text-xs font-black uppercase tracking-wide mb-1">{title}</p>}
          <p className="text-sm font-bold leading-snug break-words">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 border-2 border-pink bg-surface text-pink px-3 py-1.5 text-xs font-bold uppercase hover:bg-pink hover:text-text transition-colors cursor-pointer"
        >
          {retryLabel ?? 'RETRY'}
        </button>
      )}
    </div>
  )
}
