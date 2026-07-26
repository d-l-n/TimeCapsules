import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './Icons'

interface SectionHeaderProps {
  id: string
  title: string
  count?: number
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
  actionLoading?: boolean
  children?: ReactNode
}

export default function SectionHeader({ id, title, count, actionLabel, actionTo, onAction, actionLoading, children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-[3px] border-border pb-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <h2 id={id} className="text-xl sm:text-2xl font-black uppercase font-heading truncate">{title}</h2>
        {count != null && <span className="border-2 border-border bg-yellow px-2 py-0.5 text-xs font-bold shrink-0">{count}</span>}
      </div>
      {actionLabel && (actionTo || onAction) && (
        actionTo ? (
          <Link to={actionTo} className="text-[10px] sm:text-xs font-bold uppercase text-text-secondary sm:hover:text-text transition-colors shrink-0 leading-none flex items-center gap-1">
            {actionLabel} <ArrowRightIcon className="w-3 h-3 inline" />
          </Link>
        ) : (
          <button
            onClick={onAction}
            disabled={actionLoading}
            className="text-[10px] sm:text-xs font-bold uppercase text-text-secondary sm:hover:text-text transition-colors disabled:opacity-40 shrink-0 cursor-pointer leading-none"
            aria-label={actionLabel}
          >
            {actionLoading ? '...' : actionLabel}
          </button>
        )
      )}
      {children}
    </div>
  )
}
