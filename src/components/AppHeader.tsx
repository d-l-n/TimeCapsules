import { memo, type ReactNode } from 'react'

interface AppHeaderProps {
  title?: ReactNode
  titleClassName?: string
  leading?: ReactNode
  main?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
  hidden?: boolean
}

function joinClasses(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

const AppHeader = memo(function AppHeader({
  title,
  titleClassName = 'text-2xl font-bold tracking-tighter',
  leading,
  main,
  actions,
  children,
  className,
  hidden = false,
}: AppHeaderProps) {
  return (
    <header
      className={joinClasses('flex items-center gap-3 px-4 py-3 bg-surface border-b-4 border-border transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', hidden && 'chrome-hidden', className)}
      data-app-header="true"
    >
      {children || (
        <>
          {leading}
          <div className="flex-1 min-w-0">
            {main || <h1 className={titleClassName}>{title}</h1>}
          </div>
          {actions ? <div className="flex items-center gap-2 ml-auto">{actions}</div> : null}
        </>
      )}
    </header>
  )
})

export default AppHeader
