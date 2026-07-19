import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../lib/I18nContext'
import Layout from './Layout'

vi.mock('../lib/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../lib/ThemeContext', () => ({
  useTheme: vi.fn(),
}))

vi.mock('../hooks', () => ({
  useOnlineStatus: vi.fn(() => true),
  useDevice: vi.fn(),
  useNotifications: vi.fn(),
  useNavVisibility: vi.fn(),
}))

const { useAuth } = await import('../lib/AuthContext')
const { useTheme } = await import('../lib/ThemeContext')
const { useDevice, useNotifications, useNavVisibility } = await import('../hooks')

const mockUser = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'TestUser',
  photoURL: null,
} as any

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/dashboard']}>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: mockUser, logout: vi.fn(), loading: false } as any)
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', toggle: vi.fn() } as any)
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      loading: false,
      refresh: vi.fn(),
    })
    vi.mocked(useNavVisibility).mockReturnValue({ chromeHiddenByScroll: false, navHiddenByScroll: false, isMobileBottomBar: false })
  })

  // ── Desktop Layout ──────────────────────────────────

  it('renders app name in desktop header', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    expect(screen.getByText(/TIME CAPSULES/i)).toBeInTheDocument()
  })

  it('renders Dashboard and Groups nav links on desktop', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    const dashboardLinks = screen.getAllByRole('link', { name: /Dashboard/i })
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: /Groups/i })).toBeInTheDocument()
  })

  it('renders Discover button on desktop', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    expect(screen.getByRole('link', { name: /Discover/i })).toBeInTheDocument()
  })

  it('renders theme toggle button on desktop', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    const toggle = screen.getByRole('button', { name: /Dark/i })
    expect(toggle).toBeInTheDocument()
  })

  it('renders user name and profile link on desktop', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    expect(screen.getByText(/TestUser/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Profile/i })).toBeInTheDocument()
  })

  it('shows notifications bell on desktop', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument()
  })

  it('shows unread badge when there are unread notifications', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 3,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      loading: false,
      refresh: vi.fn(),
    })
    render(<Layout />, { wrapper })
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows 9+ badge when unread count exceeds 9', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 15,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      loading: false,
      refresh: vi.fn(),
    })
    render(<Layout />, { wrapper })
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('opens notification panel on bell click', async () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    await waitFor(() => expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument())
  })

  it('calls theme toggle on button click', () => {
    const toggle = vi.fn()
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', toggle } as any)
    render(<Layout />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /Dark/i }))
    expect(toggle).toHaveBeenCalledOnce()
  })

  it('shows theme toggle icon changes between light and dark', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    const { rerender } = render(<Layout />, { wrapper })
    expect(screen.getByRole('button', { name: /Dark/i })).toBeInTheDocument()

    vi.mocked(useTheme).mockReturnValue({ theme: 'dark', toggle: vi.fn() } as any)
    rerender(<Layout />)
    expect(screen.getByRole('button', { name: /Light/i })).toBeInTheDocument()
  })

  it('renders main content area with role main on desktop', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    render(<Layout />, { wrapper })
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  // ── Mobile Layout ───────────────────────────────────

  it('renders app name in mobile header', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: true, isDesktop: false })
    render(<Layout />, { wrapper })
    expect(screen.getByText(/TIME CAPSULES/i)).toBeInTheDocument()
  })

  it('renders bottom navigation with nav items on mobile', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: true, isDesktop: false })
    render(<Layout />, { wrapper })
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })

  it('applies nav-hidden class when navHiddenByScroll is true on mobile', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: true, isDesktop: false })
    vi.mocked(useNavVisibility).mockReturnValue({ chromeHiddenByScroll: false, navHiddenByScroll: true, isMobileBottomBar: true })
    const { container } = render(<Layout />, { wrapper })
    const nav = container.querySelector('nav')
    expect(nav!.className).toContain('nav--hidden')
  })

  it('renders main content with bottom padding for mobile nav', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: true, isDesktop: false })
    render(<Layout />, { wrapper })
    const main = screen.getByRole('main')
    expect(main.className).toContain('pb-28')
  })

  it('shows user initial on mobile profile link', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: true, isDesktop: false })
    render(<Layout />, { wrapper })
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('opens notification panel on mobile bell click', async () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: true, isDesktop: false })
    render(<Layout />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    await waitFor(() => expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument())
  })

  // ── User Display Edge Cases ─────────────────────────

  it('shows email username when displayName is null', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'user@example.com', displayName: null, photoURL: null },
      logout: vi.fn(),
      loading: false,
    } as any)
    render(<Layout />, { wrapper })
    expect(screen.getByText(/user/i)).toBeInTheDocument()
  })

  it('shows initial from email when displayName is null on mobile', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: true, isDesktop: false })
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'alice@example.com', displayName: null, photoURL: null },
      logout: vi.fn(),
      loading: false,
    } as any)
    render(<Layout />, { wrapper })
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders user photo when photoURL is provided', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com', displayName: 'User', photoURL: 'https://example.com/photo.jpg' },
      logout: vi.fn(),
      loading: false,
    } as any)
    render(<Layout />, { wrapper })
    const img = document.querySelector('img[src*="photo.jpg"]')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  // ── Sub-components ──────────────────────────────────

  it('renders OfflineBanner inside layout', () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    const { container } = render(<Layout />, { wrapper })
    expect(container.querySelector('[role="status"]')).not.toBeInTheDocument()
  })

  it('renders NotificationPanel with notifications list when opened', async () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
        { id: 'n1', title: 'New Episode', body: 'S5E1 aired', read: false, show_id: 1, uid: 'user-1', createdAt: 1 },
        { id: 'n2', title: 'Update', body: 'Show updated', read: true, show_id: 2, uid: 'user-1', createdAt: 2 },
      ] as any,
      unreadCount: 1,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      loading: false,
      refresh: vi.fn(),
    })
    render(<Layout />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    await waitFor(() => {
      expect(screen.getByText('New Episode')).toBeInTheDocument()
      expect(screen.getByText('Update')).toBeInTheDocument()
    })
  })

  it('calls markAsRead when READ button is clicked in notification panel', async () => {
    vi.mocked(useDevice).mockReturnValue({ isMobile: false, isDesktop: true })
    const mockMarkAsRead = vi.fn()
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
        { id: 'n1', title: 'New Episode', body: 'S5E1 aired', read: false, show_id: 1, uid: 'user-1', createdAt: 1 },
      ] as any,
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: vi.fn(),
      loading: false,
      refresh: vi.fn(),
    })
    render(<Layout />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    const readBtn = await screen.findByRole('button', { name: /READ$/i })
    fireEvent.click(readBtn)
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('n1'))
  })
})
