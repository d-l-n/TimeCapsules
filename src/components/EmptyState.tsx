import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateAction {
  label: string
  to?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  children,
}: {
  title: string
  description?: string
  icon?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  children?: ReactNode
}) {
  return (
    <div className="text-center py-16 sm:py-24">
      <div className="inline-block border-[3px] border-border bg-surface p-6 sm:p-8 max-w-md shadow-brutal">
        {icon && <div className="text-4xl sm:text-5xl mb-4" aria-hidden="true">{icon}</div>}
        <h2 className="text-xl sm:text-2xl font-black mb-2 uppercase font-heading">{title}</h2>
        {description && <p className="text-sm text-text-secondary mb-6 leading-relaxed">{description}</p>}
        {action && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {action.to ? (
              <Link
                to={action.to}
                className={`inline-block border-[3px] border-border px-5 py-3 text-xs font-bold uppercase transition-all shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md ${
                  action.variant === 'secondary'
                    ? 'bg-surface text-text hover:bg-yellow'
                    : 'bg-yellow text-text hover:bg-orange'
                }`}
                onClick={action.onClick}
              >
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className={`inline-block border-[3px] border-border px-5 py-3 text-xs font-bold uppercase transition-all shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md cursor-pointer ${
                  action.variant === 'secondary'
                    ? 'bg-surface text-text hover:bg-yellow'
                    : 'bg-yellow text-text hover:bg-orange'
                }`}
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              secondaryAction.to ? (
                <Link
                  to={secondaryAction.to}
                  className="inline-block border-[3px] border-border px-5 py-3 text-xs font-bold uppercase bg-surface text-text hover:bg-yellow transition-all shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5"
                  onClick={secondaryAction.onClick}
                >
                  {secondaryAction.label}
                </Link>
              ) : (
                <button
                  onClick={secondaryAction.onClick}
                  className="inline-block border-[3px] border-border px-5 py-3 text-xs font-bold uppercase bg-surface text-text hover:bg-yellow transition-all shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
                >
                  {secondaryAction.label}
                </button>
              )
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
