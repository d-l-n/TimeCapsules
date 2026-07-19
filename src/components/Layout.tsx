import { type ReactNode, useState, useEffect } from 'react'
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

const DashboardIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>
const GroupIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.8M21 20c0-2.6-1.6-4.8-4-5.6"/></svg>
const SearchIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
const BellIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
const StatsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
const ProfileIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>

export default function Layout() {
  const { user } = useAuth()
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
    { to: '/library', label: t.library.title, icon: <GroupIcon /> },
    { to: '/discover', label: t.nav.discover, icon: <SearchIcon /> },
    { to: '/profile?section=stats', label: t.profile.statsTab, icon: <StatsIcon /> },
    { to: '/profile', label: t.profile.accountTab, icon: <ProfileIcon /> },
  ]

  useEffect(() => { setShowNotifPanel(false) }, [pathname])

  return (
    <div className="min-h-screen bg-bg flex" lang={lang}>
      <OfflineBanner />
      <NavContext.Provider value={{ chromeHiddenByScroll }}>
      {isMobile ? (
          <MobileLayout
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
          <DesktopSidebar
            user={user}
            navItems={navItems}
            theme={theme}
            toggle={toggle}
            t={t}
            pathname={pathname}
            {...notifData}
            showNotifPanel={showNotifPanel}
            setShowNotifPanel={setShowNotifPanel}
            closeNotifs={closeNotifs}
          />
          <main className="flex-1 min-w-0 max-w-[1400px] mx-auto w-full px-5 pt-6 pb-12 lg:px-8 lg:ml-[224px]" id="main-content" role="main">
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
      <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto bg-surface border-3 border-border shadow-[8px_8px_0_#111] z-30">
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

function DesktopSidebar({ user, navItems, theme, toggle, t, pathname, notifications, unreadCount, markAsRead, markAllAsRead, showNotifPanel, setShowNotifPanel, closeNotifs }: {
  user: ReturnType<typeof useAuth>['user']
  navItems: NavItem[]
  theme: string
  toggle: () => void
  t: ReturnType<typeof useI18n>['t']
  pathname: string
} & ReturnType<typeof useNotifications> & { showNotifPanel: boolean; setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>; closeNotifs: () => void }) {
  return (
    <aside className="sidebar fixed top-0 left-0 bottom-0 w-[224px] flex flex-col z-30" role="banner">
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-4 h-[68px] border-b-[3px] border-white/20 shrink-0 hover:bg-[#222] transition-colors"
        aria-label={`${t.app.name} — ${t.nav.dashboard}`}
      >
        <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-lg font-black leading-none font-heading">TC</span>
        <span className="text-white font-black uppercase tracking-tight text-sm leading-none">{t.app.name}</span>
      </Link>

      <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 px-3" aria-label={t.nav.dashboard}>
        {navItems.map(({ to, label, icon }) => {
          const isActive = to.startsWith('/profile')
            ? pathname.startsWith('/profile')
            : pathname === to || pathname.startsWith(to + '/')
          return (
            <NavLink
              key={to}
              to={to}
              className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
              aria-label={label}
            >
              <span className="shrink-0">{icon}</span>
              <span className="truncate">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t-[3px] border-white/20 flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(prev => !prev)}
              className="sidebar-pill relative"
              aria-label={t.notifications.title}
            >
              <BellIcon />
              {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
          </div>
          <button
            onClick={toggle}
            className="sidebar-pill"
            aria-label={theme === 'light' ? t.settings.dark : t.settings.light}
          >
            {theme === 'light' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <NavLink
          to="/profile"
          className={`flex items-center gap-3 px-2 py-2 border-3 border-white/30 transition-colors ${pathname.startsWith('/profile') ? 'bg-yellow text-text border-yellow' : 'hover:bg-[#222] text-white'}`}
          aria-label={t.profile.title}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-9 h-9 border-2 border-white object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 bg-yellow border-2 border-white flex items-center justify-center text-sm font-black text-text shrink-0">U</div>
          )}
          <span className="text-xs font-bold uppercase truncate leading-tight text-left">{user?.displayName || user?.email?.split('@')[0] || 'User'}</span>
        </NavLink>
      </div>
    </aside>
  )
}

function MobileLayout({ navItems, theme, toggle, t, notifications, unreadCount, markAsRead, markAllAsRead, showNotifPanel, setShowNotifPanel, closeNotifs, navHiddenByScroll }: {
  navItems: NavItem[]
  theme: string
  toggle: () => void
  t: ReturnType<typeof useI18n>['t']
} & ReturnType<typeof useNotifications> & { showNotifPanel: boolean; setShowNotifPanel: React.Dispatch<React.SetStateAction<boolean>>; closeNotifs: () => void; navHiddenByScroll: boolean }) {
  const location = useLocation()
  return (
    <>
      <header className="sticky top-0 z-10 bg-text border-b-[3px] border-border" role="banner">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/dashboard" className="flex items-center gap-2" aria-label={`${t.app.name} — ${t.nav.dashboard}`}>
            <span className="bg-yellow text-text border-3 border-border px-2 py-1 text-base font-black leading-none font-heading">TC</span>
            <span className="text-white font-black uppercase tracking-tight text-sm leading-none">{t.app.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(prev => !prev)} className="sidebar-pill" aria-label={t.notifications.title}>
                <BellIcon />
                {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-pink text-text border-2 border-border text-[9px] font-bold min-w-[18px] h-4 flex items-center justify-center px-0.5 leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && <NotificationPanel notifications={notifications} unreadCount={unreadCount} markAsRead={markAsRead} markAllAsRead={markAllAsRead} closeNotifs={closeNotifs} t={t} />}
            </div>
            <button onClick={toggle} className="sidebar-pill" aria-label={theme === 'light' ? t.settings.dark : t.settings.light}>
              {theme === 'light' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-5 pb-28" id="main-content" role="main">
        <Outlet />
      </main>
      <nav className={`nav-pill ${navHiddenByScroll ? 'nav--hidden' : ''}`} aria-label={t.nav.dashboard}>
        {navItems.map(({ to, label, icon }) => {
          const isActive = to.startsWith('/profile') ? location.pathname.startsWith('/profile') : location.pathname === to || location.pathname.startsWith(to + '/')
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
