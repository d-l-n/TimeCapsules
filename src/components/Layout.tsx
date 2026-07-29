import { type ReactNode, useState, useEffect, Suspense } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { useI18n } from '../lib/I18nContext'

import { useDevice, useNotifications, useNavVisibility } from '../hooks'
import type { NotificationDoc } from '../lib/firebase-queries'
import { MenuIcon, CloseIcon, SunIcon, MoonIcon } from '.'
import { DashboardIcon, GroupIcon, LibraryIcon, SearchIcon, BellIcon, StatsIcon } from './Icons'
import InstallBanner from './InstallBanner'
import OfflineBanner from './OfflineBanner'
import ScrollToTop from './ScrollToTop'
import Loading from './Loading'





export default function Layout() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const { t, lang } = useI18n()
  const { pathname } = useLocation()
  const { isMobile, isSidebarCollapsed } = useDevice()
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const notifData = useNotifications(user?.uid)
  const { navHiddenByScroll } = useNavVisibility({ showNotifPanel })

  const closeNotifs = () => setShowNotifPanel(false)
  const closeSidebar = () => setSidebarOpen(false)

  const navItems = [
    { to: '/dashboard', label: t.nav.dashboard, icon: <DashboardIcon /> },
    { to: '/groups', label: t.nav.groups, icon: <GroupIcon /> },
    { to: '/discover', label: t.nav.discover, icon: <SearchIcon /> },
    { to: '/library', label: t.library.title, icon: <LibraryIcon /> },
    { to: '/profile?section=stats', label: t.profile.statsTab, icon: <StatsIcon /> },
  ]

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  useEffect(() => { setShowNotifPanel(false); setSidebarOpen(false); window.scrollTo(0, 0) }, [pathname])

  // Close sidebar on Escape key
  useEffect(() => {
    if (!sidebarOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [sidebarOpen])

  const sidebarProps = {
    user,
    navItems,
    theme,
    toggle,
    t,
    pathname,
    ...notifData,
    showNotifPanel,
    setShowNotifPanel,
    closeNotifs,
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col" lang={lang}>
      <OfflineBanner />
      {isMobile ? (
        <MobileLayout
          user={user}
          navItems={navItems}
          theme={theme}
          toggle={toggle}
          t={t}
          {...notifData}
          showNotifPanel={showNotifPanel}
          setShowNotifPanel={setShowNotifPanel}
          closeNotifs={closeNotifs}
          navHiddenByScroll={navHiddenByScroll}
          scrollToTop={scrollToTop}
        />
      ) : isSidebarCollapsed ? (
        <TabletLayout
          {...sidebarProps}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          closeSidebar={closeSidebar}
        />
      ) : (
        <>
          <DesktopSidebar {...sidebarProps} scrollToTop={scrollToTop} />
          <main className="flex-1 min-w-0 px-6 pt-6 pb-12 lg:px-8 lg:ml-[224px] lg:w-[calc(100%-224px)] lg:max-w-[1400px]" id="main-content" role="main">
            <Suspense fallback={<Loading />}><Outlet /></Suspense>
          </main>
        </>
      )}

      <InstallBanner />
      <ScrollToTop />
    </div>
  )
}

interface NavItem { to: string; label: string; icon: ReactNode }

function NotificationPanel({ notifications, unreadCount, markAsRead, markAllAsRead, closeNotifs, t, positionTop }: {
  notifications: NotificationDoc[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  closeNotifs: () => void
  t: ReturnType<typeof useI18n>['t']
  positionTop?: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={closeNotifs} />
      <div className={`${positionTop ? 'absolute top-full right-0 mt-2' : 'absolute bottom-full left-0 mb-2'} w-80 max-h-96 overflow-y-auto bg-surface text-text border-3 border-border shadow-brutal z-30`}>
        <div className="flex items-center justify-between border-b-[3px] border-border px-3 py-2 bg-surface-light">
          <span className="text-xs font-bold uppercase">{t.notifications.title} ({unreadCount})</span>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} aria-label={t.notifications.markAllRead} className="notif-btn">{t.notifications.markAllRead}</button>
          )}
        </div>
        {notifications.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-secondary text-center">{t.notifications.empty}</div>
        )}
        {notifications.map(n => (
          <div key={n.id} className={`flex items-start gap-2 px-3 py-2 border-b border-border last:border-b-0 ${n.read ? '' : 'bg-yellow/20'}`}>
            <Link to={n.show_id != null ? `/show/${n.show_id}` : '#'} className="flex-1 min-w-0" onClick={closeNotifs}>
              <div className="text-xs font-bold">{n.title}</div>
              <div className="text-[10px] text-text-secondary mt-0.5">{n.body}</div>
            </Link>
            {!n.read && (
              <button onClick={() => markAsRead(n.id)} className="notif-btn shrink-0" aria-label={t.notifications.markRead}>{t.notifications.markRead}</button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function DesktopSidebar(props: SidebarProps & { scrollToTop: () => void }) {
  return (
    <aside className="sidebar fixed top-0 left-0 bottom-0 w-[224px] flex flex-col z-30" role="banner">
      <SidebarContent {...props} />
    </aside>
  )
}

type SidebarProps = {
  user: ReturnType<typeof useAuth>['user']
  navItems: NavItem[]
  theme: string
  toggle: () => void
  t: ReturnType<typeof useI18n>['t']
  pathname: string
} & ReturnType<typeof useNotifications> & { showNotifPanel: boolean; setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>; closeNotifs: () => void }

/**
 * Shared inner content for both DesktopSidebar and tablet drawer.
 * Accepts optional onNavClick to close the drawer on navigation.
 */
function SidebarContent({ user, navItems, theme, toggle, t, pathname, notifications, unreadCount, markAsRead, markAllAsRead, showNotifPanel, setShowNotifPanel, closeNotifs, onNavClick, hideBottom, scrollToTop }: SidebarProps & { onNavClick?: () => void; hideBottom?: boolean; scrollToTop?: () => void }) {
  const { search } = useLocation()
  return (
    <>
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-4 h-[68px] border-b-[3px] border-white/20 shrink-0 sm:hover:bg-white/10 transition-colors"
        aria-label={`${t.app.name} — ${t.nav.dashboard}`}
        onClick={onNavClick}
      >
        <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-lg font-black leading-none font-heading">TC</span>
        <span className="text-white font-black uppercase tracking-tight text-sm leading-none">{t.app.name}</span>
      </Link>

      <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 px-3" aria-label={t.nav.dashboard}>
        {navItems.map(({ to, label, icon }) => {
          const isActive = to === '/profile?section=stats'
            ? pathname === '/profile' && search.includes('section=stats')
            : pathname === to || pathname.startsWith(to + '/')
          return (
            <NavLink
              key={to}
              to={to}
              className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
              aria-label={label}
              onClick={() => { onNavClick?.(); scrollToTop?.() }}
            >
              <span className="shrink-0">{icon}</span>
              <span className="truncate">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {!hideBottom && <div className="px-3 py-3 border-t-[3px] border-white/20 flex flex-col gap-2 shrink-0">          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(prev => !prev)}
                className="sidebar-pill sidebar-pill--invert tooltip-brutal"
                aria-label={t.notifications.title}
                data-tooltip={t.notifications.title}
              >
                <BellIcon />
                {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
            </div>
            <button
              onClick={toggle}
              className="sidebar-pill sidebar-pill--invert tooltip-brutal"
              aria-label={theme === 'light' ? t.settings.dark : t.settings.light}
              data-tooltip={theme === 'light' ? t.settings.dark : t.settings.light}
            >
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
          </div>

        <NavLink
          to="/profile"
          className={`sidebar-profile-btn tooltip-brutal ${pathname.startsWith('/profile') ? 'sidebar-profile-btn--active' : ''}`}
          aria-label={t.profile.title}
          data-tooltip={t.profile.title}
          onClick={() => { onNavClick?.(); scrollToTop?.() }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-10 h-10 border-2 border-white/30 object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-yellow border-2 border-white/30 flex items-center justify-center text-sm font-black text-text shrink-0">U</div>
          )}
          <span className="text-xs font-bold uppercase truncate leading-tight text-left">{user?.displayName || user?.email?.split('@')[0] || 'User'}</span>
        </NavLink>
      </div>}
    </>
  )
}

function TabletLayout({ user, navItems, theme, toggle, t, pathname, notifications, unreadCount, markAsRead, markAllAsRead, loading, refresh, showNotifPanel, setShowNotifPanel, closeNotifs, sidebarOpen, setSidebarOpen, closeSidebar }: SidebarProps & {
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  closeSidebar: () => void
}) {
  return (
    <>
      {/* Top header bar with hamburger */}
      <header className="fixed top-0 z-30 bg-text border-b-[3px] border-border w-full text-white" role="banner">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="sidebar-pill tooltip-brutal tooltip-brutal--down"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              data-tooltip={sidebarOpen ? 'Close menu' : 'Menu'}
            >
              {sidebarOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2" aria-label={`${t.app.name} — ${t.nav.dashboard}`}>
              <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-base font-black leading-none font-heading">TC</span>
              <span className="text-white font-black uppercase tracking-tight text-sm leading-none">{t.app.name}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(prev => !prev)} className="sidebar-pill sidebar-pill--invert tooltip-brutal tooltip-brutal--down" aria-label={t.notifications.title} data-tooltip={t.notifications.title}>
                <BellIcon />
                {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[18px] h-4 flex items-center justify-center px-0.5 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} positionTop />}
            </div>
            <button onClick={toggle} className="sidebar-pill sidebar-pill--invert tooltip-brutal tooltip-brutal--down" aria-label={theme === 'light' ? t.settings.dark : t.settings.light} data-tooltip={theme === 'light' ? t.settings.dark : t.settings.light}>
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
            <Link
              to="/profile"
              className="sidebar-pill sidebar-pill--invert overflow-hidden tooltip-brutal tooltip-brutal--down"
              aria-label={t.profile.title}
              data-tooltip={t.profile.title}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black text-white">{user?.displayName?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Sidebar overlay backdrop */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--visible' : ''}`} onClick={closeSidebar} />

      {/* Sidebar drawer */}
      <aside className={`sidebar-drawer ${sidebarOpen ? 'sidebar-drawer--open' : ''}`} role="banner" aria-hidden={!sidebarOpen}>
        <SidebarContent
          user={user}
          navItems={navItems}
          theme={theme}
          toggle={toggle}
          t={t}
          pathname={pathname}
          notifications={notifications}
          unreadCount={unreadCount}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          loading={loading}
          refresh={refresh}
          showNotifPanel={showNotifPanel}
          setShowNotifPanel={setShowNotifPanel}
          closeNotifs={closeNotifs}
          onNavClick={closeSidebar}
        />
      </aside>

      <main className="flex-1 min-w-0 max-w-[1400px] mx-auto w-full px-6 pt-[80px] pb-12 lg:px-8" id="main-content" role="main">
        <Suspense fallback={<Loading />}><Outlet /></Suspense>
      </main>
    </>
  )
}

function MobileLayout({ user, navItems, theme, toggle, t, notifications, unreadCount, markAsRead, markAllAsRead, showNotifPanel, setShowNotifPanel, closeNotifs, navHiddenByScroll, scrollToTop }: {
  user: ReturnType<typeof useAuth>['user']
  navItems: NavItem[]
  theme: string
  toggle: () => void
  t: ReturnType<typeof useI18n>['t']
  scrollToTop: () => void
} & ReturnType<typeof useNotifications> & { showNotifPanel: boolean; setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>; closeNotifs: () => void; navHiddenByScroll: boolean }) {
  const location = useLocation()
  return (
    <>
<header className="fixed top-0 z-30 bg-text border-b-[3px] border-border w-full text-white" role="banner">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2" aria-label={`${t.app.name} — ${t.nav.dashboard}`}>
            <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-base font-black leading-none font-heading">TC</span>
            <span className="text-white font-black uppercase tracking-tight text-sm leading-none">{t.app.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(prev => !prev)} className="sidebar-pill sidebar-pill--invert tooltip-brutal tooltip-brutal--down" aria-label={t.notifications.title} data-tooltip={t.notifications.title}>
                <BellIcon />
                {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[18px] h-4 flex items-center justify-center px-0.5 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} positionTop />}
            </div>
            <button onClick={toggle} className="sidebar-pill sidebar-pill--invert tooltip-brutal tooltip-brutal--down" aria-label={theme === 'light' ? t.settings.dark : t.settings.light} data-tooltip={theme === 'light' ? t.settings.dark : t.settings.light}>
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
            <Link
              to="/profile"
              className="sidebar-pill sidebar-pill--invert overflow-hidden tooltip-brutal tooltip-brutal--down"
              aria-label={t.profile.title}
              data-tooltip={t.profile.title}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black text-white">{user?.displayName?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-5 pt-[76px] pb-28" id="main-content" role="main">
        <Suspense fallback={<Loading />}><Outlet /></Suspense>
      </main>
      <nav className={`nav-pill ${navHiddenByScroll ? 'nav--hidden' : ''}`} aria-label={t.nav.dashboard}>
        {navItems.map(({ to, label, icon }) => {
          const isActive = to === '/profile?section=stats'
            ? location.pathname === '/profile' && location.search.includes('section=stats')
            : location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <NavLink key={to} to={to} onClick={scrollToTop} className={`nav-pill-btn ${isActive ? 'nav-pill-btn--active' : ''}`} aria-label={label} aria-current={isActive ? 'page' : undefined}>
              <span className="nav-pill-icon">{icon}</span>
              <span className="nav-pill-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
