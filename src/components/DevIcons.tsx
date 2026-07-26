/* ══════════════════════════════════════════════════════
   DevTools SVG Icons — brutalist style icons
   All: viewBox 24×24, stroke currentColor, square caps
   ══════════════════════════════════════════════════════ */

import React from 'react'

function SvgBase({ className = 'w-3.5 h-3.5', children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
      {children}
    </svg>
  )
}

export function HexagonIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M12 2L22 7v10L12 22 2 17V7l10-5z" />
    </SvgBase>
  )
}

export function DiamondIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M12 2L19 12l-7 10-7-10 7-10z" />
      <path d="M12 2L5 12l7 10" strokeWidth="1.5" />
    </SvgBase>
  )
}

export function TargetIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </SvgBase>
  )
}

export function BoltIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </SvgBase>
  )
}

export function HelpIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.5 10a2.5 2.5 0 1 1 4.5 1.5c-.8.8-2 1.5-2 3" strokeWidth="2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </SvgBase>
  )
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="10" cy="10" r="7" />
      <path d="M15 15l6 6" />
    </SvgBase>
  )
}

export function PersonIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
    </SvgBase>
  )
}

export function GlobeIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" strokeWidth="1.5" />
      <path d="M7.5 3.5C5 6 3.5 9 3.5 12s1.5 6 4 8.5M16.5 3.5c2.5 2.5 4 5.5 4 8.5s-1.5 6-4 8.5" strokeWidth="1.5" />
    </SvgBase>
  )
}

export function ErrorIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </SvgBase>
  )
}

export function GroupIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="8.5" cy="7" r="3.5" />
      <circle cx="15.5" cy="7" r="3.5" />
      <path d="M2 21v-1.5a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5V21" />
      <path d="M14 14.5a4 4 0 0 1 8 0V21h-4" />
    </SvgBase>
  )
}

export function BellIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M18 11V8a6 6 0 0 0-12 0v3l-2 4h16l-2-4z" />
      <path d="M10 20a2 2 0 0 0 4 0" strokeWidth="2" />
    </SvgBase>
  )
}

export function PackageIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M12 2L5 6v6l7 4 7-4V6l-7-4z" />
      <path d="M5 10l7 4 7-4" />
      <path d="M12 20v-8" />
    </SvgBase>
  )
}

export function PaletteIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <circle cx="8" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="15" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M16 16a2 2 0 0 1 2-2h2" />
    </SvgBase>
  )
}

export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M2 2l20 20" strokeWidth="2" />
      <path d="M6.5 6.7A10.5 10.5 0 0 0 1 12c2.5 5 7 8 11 8 1.8 0 3.6-.5 5.2-1.4" strokeWidth="2" />
      <path d="M16.8 9.5A5 5 0 0 0 9.5 16.8" strokeWidth="2" />
      <path d="M23 12c-2.5-5-7-8-11-8-1 0-2 .2-3 .5" strokeWidth="2" />
    </SvgBase>
  )
}

export function MonitorIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </SvgBase>
  )
}

export function RefreshIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M21 12a9 9 0 1 0-3 6.5" />
      <path d="M21 6v6h-6" />
    </SvgBase>
  )
}

export function KeyboardIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" strokeWidth="2" strokeLinecap="round" />
    </SvgBase>
  )
}

export function PuzzleIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M16 4h3a2 2 0 0 1 2 2v3a3 3 0 0 0-3 3 3 3 0 0 0 3 3v3a2 2 0 0 1-2 2h-3" />
      <path d="M8 4H5a2 2 0 0 0-2 2v3a3 3 0 0 1 3 3 3 3 0 0 1-3 3v3a2 2 0 0 0 2 2h3" />
      <path d="M8 2v4M8 18v4" strokeWidth="2" />
    </SvgBase>
  )
}

export function FlaskIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M9 2v6l-5 11a2 2 0 0 0 1.5 3h11a2 2 0 0 0 1.5-3L15 8V2" />
      <path d="M7 16h10" />
      <path d="M9 2h6" />
    </SvgBase>
  )
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M5 5L19 19" />
      <path d="M19 5L5 19" />
    </SvgBase>
  )
}
