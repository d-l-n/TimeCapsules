import { type ReactNode, useState, useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { useI18n } from '../lib/I18nContext'
import { NavContext } from '../lib/NavContext'
import { useDevice, useNotifications, useNavVisibility } from '../hooks'
import type { NotificationDoc } from '../lib/firebase-queries'
import { MenuIcon, CloseIcon } from './Icons'
import InstallBanner from './InstallBanner'
import OfflineBanner from './OfflineBanner'
import ScrollToTop from './ScrollToTop'
import ReloadButton from './ReloadButton'

const DashboardIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>
const GroupIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.8M21 20c0-2.6-1.6-4.8-4-5.6"/></svg>
const LibraryIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="4" height="18"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="9" width="4" height="12"/></svg>
const SearchIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
const BellIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.02 2.91C8.71 2.91 6.02 5.6 6.02 8.91v2.89c0 .61-.26 1.54-.57 2.06L4.3 15.77c-.71 1.18-.22 2.49 1.08 2.93 4.31 1.44 8.96 1.44 13.27 0 1.21-.4 1.74-1.83 1.08-2.93l-1.15-1.91c-.3-.52-.56-1.45-.56-2.06V8.91c0-3.3-2.7-6-6-6Z"/><path d="M13.87 3.2a6.3 6.3 0 0 0-3.7 0c.29-.74 1.01-1.26 1.85-1.26s1.56.52 1.85 1.26Z"/><path d="M15.02 19.06c0 1.65-1.35 3-3 3a3 3 0 0 1-3-3"/></svg>
const StatsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>

export default function Layout() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const { t, lang } = useI18n()
  const { pathname } = useLocation()
  const { isMobile, isSidebarCollapsed } = useDevice()
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const notifData = useNotifications(user?.uid)
  const { chromeHiddenByScroll, navHiddenByScroll } = useNavVisibility({ showNotifPanel, pathname })

  const closeNotifs = () => setShowNotifPanel(false)
  const closeSidebar = () => setSidebarOpen(false)

  const navItems = [
    { to: '/dashboard', label: t.nav.dashboard, icon: <DashboardIcon /> },
    { to: '/groups', label: t.nav.groups, icon: <GroupIcon /> },
    { to: '/discover', label: t.nav.discover, icon: <SearchIcon /> },
    { to: '/library', label: t.library.title, icon: <LibraryIcon /> },
    { to: '/profile?section=stats', label: t.profile.statsTab, icon: <StatsIcon /> },
  ]

  useEffect(() => { setShowNotifPanel(false); setSidebarOpen(false) }, [pathname])

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
      <NavContext.Provider value={{ chromeHiddenByScroll }}>
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
          <DesktopSidebar {...sidebarProps} />
          <main className="flex-1 min-w-0 px-6 pt-6 pb-12 lg:px-8 lg:ml-[224px] lg:w-[calc(100%-224px)] lg:max-w-[1400px]" id="main-content" role="main">
            <Outlet />
          </main>
        </>
      )}
      </NavContext.Provider>
      <InstallBanner />
      <ScrollToTop />
      <ReloadButton />
    </div>
  )
}

interface NavItem { to: string; label: string; icon: ReactNode }

function NotificationPanel({ notifications, unreadCount, markAsRead, markAllAsRead, closeNotifs, t }: {
  notifications: NotificationDoc[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  closeNotifs: () => void
  t: ReturnType<typeof useI18n>['t']
}) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={closeNotifs} />
      <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto bg-surface text-text border-3 border-border shadow-brutal z-30">
        <div className="flex items-center justify-between border-b-[3px] border-border px-3 py-2 bg-surface-light">
          <span className="text-xs font-bold uppercase">{t.notifications.title} ({unreadCount})</span>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} aria-label={t.notifications.markAllRead} className="text-[10px] font-bold uppercase border-2 border-border px-1.5 py-0.5 hover:bg-yellow cursor-pointer transition-colors bg-surface">{t.notifications.markAllRead}</button>
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
              <button onClick={() => markAsRead(n.id)} className="shrink-0 border-2 border-border px-1 py-0.5 text-[9px] font-bold uppercase hover:bg-yellow cursor-pointer transition-colors bg-surface" aria-label={t.notifications.markRead}>{t.notifications.markRead}</button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function DesktopSidebar(props: SidebarProps) {
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
function SidebarContent({ user, navItems, theme, toggle, t, pathname, notifications, unreadCount, markAsRead, markAllAsRead, showNotifPanel, setShowNotifPanel, closeNotifs, onNavClick, hideBottom }: SidebarProps & { onNavClick?: () => void; hideBottom?: boolean }) {
  const { search } = useLocation()
  return (
    <>
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-4 h-[68px] border-b-[3px] border-white/20 shrink-0 hover:bg-[#222] transition-colors"
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
              onClick={onNavClick}
            >
              <span className="shrink-0">{icon}</span>
              <span className="truncate">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {!hideBottom && <div className="px-3 py-3 border-t-[3px] border-white/20 flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(prev => !prev)}
              className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111] relative"
              aria-label={t.notifications.title}
            >
              <BellIcon />
              {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
          </div>
          <button
            onClick={toggle}
            className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111]"
            aria-label={theme === 'light' ? t.settings.dark : t.settings.light}
          >
            {theme === 'light' ? <re-icon icon="moon" className="w-6 h-6"></re-icon> : <re-icon icon="sun" className="w-6 h-6"></re-icon>}
          </button>
        </div>

        <NavLink
          to="/profile"
          className={`flex items-center gap-3 px-2 py-2 border-3 border-white/30 transition-colors ${pathname.startsWith('/profile') ? 'bg-yellow text-text border-yellow' : 'hover:bg-[#222] text-white'}`}
          aria-label={t.profile.title}
          onClick={onNavClick}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-9 h-9 border-2 border-white/30 object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 bg-yellow border-2 border-white/30 flex items-center justify-center text-sm font-black text-text shrink-0">U</div>
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
      <header className="fixed top-0 z-30 bg-text border-b-[3px] border-border w-full" role="banner">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="sidebar-pill"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
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
              <button onClick={() => setShowNotifPanel(prev => !prev)} className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111]" aria-label={t.notifications.title}>
                <BellIcon />
                {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[18px] h-4 flex items-center justify-center px-0.5 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
            </div>
            <button onClick={toggle} className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111]" aria-label={theme === 'light' ? t.settings.dark : t.settings.light}>
              {theme === 'light' ? <re-icon icon="moon" className="w-6 h-6"></re-icon> : <re-icon icon="sun" className="w-6 h-6"></re-icon>}
            </button>
            <Link
              to="/profile"
              className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111] overflow-hidden"
              aria-label={t.profile.title}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black">{user?.displayName?.charAt(0)?.toUpperCase() || 'U'}</span>
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
          hideBottom
        />
      </aside>

      <main className="flex-1 min-w-0 max-w-[1400px] mx-auto w-full px-6 pt-[80px] pb-12 lg:px-8" id="main-content" role="main">
        <Outlet />
      </main>
    </>
  )
}

function MobileLayout({ user, navItems, theme, toggle, t, notifications, unreadCount, markAsRead, markAllAsRead, showNotifPanel, setShowNotifPanel, closeNotifs, navHiddenByScroll }: {
  user: ReturnType<typeof useAuth>['user']
  navItems: NavItem[]
  theme: string
  toggle: () => void
  t: ReturnType<typeof useI18n>['t']
} & ReturnType<typeof useNotifications> & { showNotifPanel: boolean; setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>; closeNotifs: () => void; navHiddenByScroll: boolean }) {
  const location = useLocation()
  return (
    <>
      <header className="fixed top-0 z-30 bg-text border-b-[3px] border-border w-full" role="banner">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2" aria-label={`${t.app.name} — ${t.nav.dashboard}`}>
            <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-base font-black leading-none font-heading">TC</span>
            <span className="text-white font-black uppercase tracking-tight text-sm leading-none">{t.app.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(prev => !prev)} className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111]" aria-label={t.notifications.title}>
                <BellIcon />
                {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[18px] h-4 flex items-center justify-center px-0.5 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
            </div>
            <button onClick={toggle} className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111]" aria-label={theme === 'light' ? t.settings.dark : t.settings.light}>
                  {theme === 'light' ? <re-icon icon="moon" className="w-6 h-6"></re-icon> : <re-icon icon="sun" className="w-6 h-6"></re-icon>}
            </button>
            <Link
              to="/profile"
              className="sidebar-pill sidebar-pill--invert hover:!bg-yellow hover:!text-[#111111] overflow-hidden"
              aria-label={t.profile.title}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black">{user?.displayName?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-5 pt-[76px] pb-28" id="main-content" role="main">
        <Outlet />
      </main>
      <nav className={`nav-pill ${navHiddenByScroll ? 'nav--hidden' : ''}`} aria-label={t.nav.dashboard}>
        {navItems.map(({ to, label, icon }) => {
          const isActive = to === '/profile?section=stats'
            ? location.pathname === '/profile' && location.search.includes('section=stats')
            : location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <NavLink key={to} to={to} className={`nav-pill-btn ${isActive ? 'nav-pill-btn--active' : ''}`} aria-label={label} aria-current={isActive ? 'page' : undefined}>
              <span className="nav-pill-icon">{icon}</span>
              <span className="nav-pill-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
