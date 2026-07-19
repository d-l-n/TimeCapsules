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
      <div className="inline-block border-4 border-border bg-surface p-6 sm:p-8 max-w-md">
        {icon && <div className="text-4xl sm:text-5xl mb-4" aria-hidden="true">{icon}</div>}
        <h2 className="text-lg sm:text-xl font-bold mb-2 uppercase">{title}</h2>
        {description && <p className="text-sm text-text-secondary mb-6 leading-relaxed">{description}</p>}
        {action && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {action.to ? (
              <Link
                to={action.to}
                className={`inline-block border-4 border-border px-5 py-3 text-xs font-bold uppercase transition-colors ${
                  action.variant === 'secondary'
                    ? 'bg-surface text-text hover:bg-accent'
                    : 'bg-accent text-text hover:bg-highlight'
                }`}
                onClick={action.onClick}
              >
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className={`inline-block border-4 border-border px-5 py-3 text-xs font-bold uppercase transition-colors cursor-pointer ${
                  action.variant === 'secondary'
                    ? 'bg-surface text-text hover:bg-accent'
                    : 'bg-accent text-text hover:bg-highlight'
                }`}
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              secondaryAction.to ? (
                <Link
                  to={secondaryAction.to}
                  className="inline-block border-4 border-border px-5 py-3 text-xs font-bold uppercase bg-surface text-text hover:bg-accent transition-colors"
                  onClick={secondaryAction.onClick}
                >
                  {secondaryAction.label}
                </Link>
              ) : (
                <button
                  onClick={secondaryAction.onClick}
                  className="inline-block border-4 border-border px-5 py-3 text-xs font-bold uppercase bg-surface text-text hover:bg-accent transition-colors cursor-pointer"
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
