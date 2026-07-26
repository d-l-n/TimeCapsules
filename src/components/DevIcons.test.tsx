import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  HexagonIcon, DiamondIcon, TargetIcon, BoltIcon, HelpIcon,
  SearchIcon, PersonIcon, GlobeIcon, ErrorIcon, GroupIcon,
  BellIcon, PackageIcon, PaletteIcon, EyeOffIcon,
  MonitorIcon, RefreshIcon, KeyboardIcon, PuzzleIcon, FlaskIcon,
  CloseIcon,
} from './DevIcons'

const ALL_ICONS = [
  ['HexagonIcon', HexagonIcon],
  ['DiamondIcon', DiamondIcon],
  ['TargetIcon', TargetIcon],
  ['BoltIcon', BoltIcon],
  ['HelpIcon', HelpIcon],
  ['SearchIcon', SearchIcon],
  ['PersonIcon', PersonIcon],
  ['GlobeIcon', GlobeIcon],
  ['ErrorIcon', ErrorIcon],
  ['GroupIcon', GroupIcon],
  ['BellIcon', BellIcon],
  ['PackageIcon', PackageIcon],
  ['PaletteIcon', PaletteIcon],
  ['EyeOffIcon', EyeOffIcon],
  ['MonitorIcon', MonitorIcon],
  ['RefreshIcon', RefreshIcon],
  ['KeyboardIcon', KeyboardIcon],
  ['PuzzleIcon', PuzzleIcon],
  ['FlaskIcon', FlaskIcon],
  ['CloseIcon', CloseIcon],
] as const

describe('DevIcons', () => {
  it.each(ALL_ICONS)('%s renders without crashing', (_name, Icon) => {
    const { container } = render(<Icon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it.each(ALL_ICONS)('%s renders with custom className', (_name, Icon) => {
    const { container } = render(<Icon className="w-6 h-6" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('w-6')
    expect(svg).toHaveClass('h-6')
  })

  it.each(ALL_ICONS)('%s has aria-hidden="true"', (_name, Icon) => {
    const { container } = render(<Icon />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders all 20 icons without error', () => {
    for (const [, Icon] of ALL_ICONS) {
      const { container } = render(<Icon />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    }
  })
})
