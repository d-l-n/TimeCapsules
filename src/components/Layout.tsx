import { type ReactNode, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { useI18n } from '../lib/I18nContext'
import { NavContext } from '../lib/NavContext'
import { useDevice, useNotifications, useNavVisibility } from '../hooks'
import type { NotificationDoc } from '../lib/firebase-queries'
import { SunIcon, MoonIcon } from './Icons'
import InstallBanner from './InstallBanner'
import OfflineBanner from './OfflineBanner'
import ScrollToTop from './ScrollToTop'
import ReloadButton from './ReloadButton'
const DashboardIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
const GroupIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
const BellIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
const SearchIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { t, lang } = useI18n()
  const { pathname } = useLocation()
  const { isMobile } = useDevice()
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const notifData = useNotifications(user?.uid)
  const { chromeHiddenByScroll, navHiddenByScroll } = useNavVisibility({ showNotifPanel, pathname })

  const closeNotifs = () => setShowNotifPanel(false)

  const navItems = [
    { to: '/dashboard', label: t.nav.dashboard, icon: <DashboardIcon /> },
    { to: '/groups', label: t.groups.title, icon: <GroupIcon /> },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col overflow-x-hidden" lang={lang}>
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
      ) : (
        <>
          <DesktopHeader
            user={user}
            logout={logout}
            navItems={navItems}
            theme={theme}
            toggle={toggle}
            t={t}
            {...notifData}
            showNotifPanel={showNotifPanel}
            setShowNotifPanel={setShowNotifPanel}
            closeNotifs={closeNotifs}
          />
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 pt-[72px] pb-8" id="main-content" role="main">
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

interface NavItem { to: string; label: string; icon: ReactNode; iconOnly?: boolean }

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
      <div className="absolute top-full right-0 mt-1 bg-surface border-4 border-border z-30 w-80 max-h-96 overflow-y-auto shadow-brutal">
        <div className="flex items-center justify-between border-b-2 border-border px-3 py-2">
          <span className="text-xs font-bold uppercase">{t.notifications.title} ({unreadCount})</span>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} aria-label={t.notifications.markAllRead} className="text-[10px] font-bold uppercase border border-border px-1.5 py-0.5 hover:bg-accent cursor-pointer transition-colors">{t.notifications.markAllRead}</button>
          )}
        </div>
        {notifications.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-secondary text-center">{t.notifications.empty}</div>
        )}
        {notifications.map(n => (
          <div key={n.id} className={`flex items-start gap-2 px-3 py-2 border-b border-border last:border-b-0 ${n.read ? '' : 'bg-accent/10'}`}>
            <Link to={n.show_id != null ? `/show/${n.show_id}` : '#'} className="flex-1 min-w-0" onClick={closeNotifs}>
              <div className="text-xs font-bold">{n.title}</div>
              <div className="text-[10px] text-text-secondary mt-0.5">{n.body}</div>
            </Link>
            {!n.read && (
              <button onClick={() => markAsRead(n.id)} className="shrink-0 border border-border px-1 py-0.5 text-[9px] font-bold uppercase hover:bg-accent cursor-pointer transition-colors" aria-label={t.notifications.markRead}>{t.notifications.markRead}</button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function DesktopHeader({ user, navItems, theme, toggle, t, notifications, unreadCount, markAsRead, markAllAsRead, showNotifPanel, setShowNotifPanel, closeNotifs }: {
  user: ReturnType<typeof useAuth>['user']
  logout: () => void
  navItems: NavItem[]
  theme: string
  toggle: () => void
  t: ReturnType<typeof useI18n>['t']
} & ReturnType<typeof useNotifications> & { showNotifPanel: boolean; setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>; closeNotifs: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-surface border-b-4 border-border" role="banner">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <NavLink
          to="/dashboard"
          className="text-2xl font-bold tracking-tighter border-4 border-border px-3 bg-accent text-text hover:bg-highlight transition-colors flex items-center min-h-[52px] leading-none font-heading"
          aria-label={`${t.app.name} — ${t.nav.dashboard}`}
        >
          {t.app.name}
        </NavLink>
        <div className="flex items-center gap-2">
          <nav className="flex gap-0.5" aria-label={t.nav.dashboard}>
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `shrink-0 inline-flex items-center justify-center px-4 py-2.5 leading-none text-sm font-bold border-4 border-border transition-colors whitespace-nowrap ${isActive ? 'bg-text text-bg' : 'bg-surface text-text hover:bg-accent'}`
                }
                aria-label={label}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <span className="border-l-4 border-border h-8" />
          <NavLink
            to="/discover"
            className={({ isActive }) =>
              `inline-flex items-center justify-center w-10 h-10 border-4 border-border transition-colors cursor-pointer ${
                isActive ? 'bg-text text-bg' : 'bg-surface text-text hover:bg-accent'
              }`
            }
            aria-label={t.nav.discover}
          >
            <SearchIcon />
          </NavLink>
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(prev => !prev)}
              className="relative inline-flex items-center justify-center w-10 h-10 border-4 border-border bg-surface text-text hover:bg-accent transition-colors cursor-pointer"
              aria-label={t.notifications.title}
            >
              <BellIcon />
              {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-highlight text-text border-2 border-border text-[9px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
          </div>
          <button
            onClick={toggle}
            className="inline-flex items-center justify-center w-10 h-10 border-4 border-border bg-surface text-text hover:bg-accent transition-colors cursor-pointer"
            aria-label={theme === 'light' ? t.settings.dark : t.settings.light}
          >
            {theme === 'light' ? <SunIcon /> : <MoonIcon />}
          </button>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2 border-4 border-border px-3 py-1.5 transition-colors whitespace-nowrap min-h-[40px] ${isActive ? 'bg-text text-bg border-text' : 'bg-surface text-text hover:bg-accent'}`
            }
            aria-label={t.profile.title}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-5 h-5 border-2 border-border object-cover" />
            ) : (
                <div className="w-5 h-5 bg-accent border-2 border-border flex items-center justify-center text-[10px] font-bold text-bg shrink-0">
                  U
                </div>
            )}
            <span className="text-xs font-bold uppercase max-w-[120px] truncate">
              {(user?.displayName || user?.email?.split('@')[0]) ?? 'User'}
            </span>
          </NavLink>
        </div>
      </div>
    </header>
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
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b-4 border-border" role="banner">
        <div className="flex items-center justify-between px-4 h-14">
          <Link
            to="/dashboard"
            className="text-xl font-bold tracking-tighter border-4 border-border px-2 bg-accent text-text flex items-center min-h-[40px] leading-none font-heading hover:bg-highlight transition-colors"
            aria-label={`${t.app.name} — ${t.nav.dashboard}`}
          >
            {t.app.name}
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(prev => !prev)}
                className="x-btn relative inline-flex shrink-0 items-center justify-center aspect-square w-9 border-4 border-border bg-surface text-text hover:bg-accent transition-colors cursor-pointer"
                aria-label={t.notifications.title}
              >
                <BellIcon />
                {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-highlight text-text border-2 border-border text-[9px] font-bold min-w-[18px] h-4 flex items-center justify-center px-0.5 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
            </div>
            <button
              onClick={toggle}
              className="x-btn inline-flex shrink-0 items-center justify-center aspect-square w-9 border-4 border-border bg-surface text-text hover:bg-accent transition-colors cursor-pointer"
              aria-label={theme === 'light' ? t.settings.dark : t.settings.light}
            >
              {theme === 'light' ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link
              to="/profile"
              className="x-btn inline-flex shrink-0 items-center justify-center aspect-square w-9 border-4 border-border bg-surface text-text hover:bg-accent transition-colors"
              aria-label={t.profile.title}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold">{user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}</span>
              )}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-28" id="main-content" role="main">
        <Outlet />
      </main>
      <nav className={`nav-pill ${navHiddenByScroll ? 'nav--hidden' : ''}`} aria-label={t.nav.dashboard}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-pill-btn ${isActive ? 'nav-pill-btn--active' : ''}`
            }
            aria-label={label}
          >
            <span className="nav-pill-icon">{icon}</span>
            <span className={`nav-pill-label ${location.pathname.startsWith(to) ? 'nav-pill-label--visible' : ''}`} aria-hidden="true">
              {label}
            </span>
          </NavLink>
        ))}
        <NavLink
          to="/discover"
          className={({ isActive }) =>
            `nav-pill-btn ${isActive ? 'nav-pill-btn--active' : ''}`
          }
          aria-label={t.nav.discover}
        >
          <span className="nav-pill-icon"><SearchIcon /></span>
          <span className={`nav-pill-label ${location.pathname.startsWith('/discover') ? 'nav-pill-label--visible' : ''}`} aria-hidden="true">
            {t.nav.discover}
          </span>
        </NavLink>
      </nav>
    </>
  )
}
