import { lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Loading from './components/Loading'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ShowDetail = lazy(() => import('./pages/ShowDetail'))
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const GroupsPage = lazy(() => import('./pages/GroupsPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const GroupDetail = lazy(() => import('./pages/GroupDetail'))
const UpcomingPage = lazy(() => import('./pages/UpcomingPage'))
const ListDetail = lazy(() => import('./pages/ListDetail'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.uid) return
    const lastCheck = localStorage.getItem('lastNotifCheck')
    const today = new Date().toDateString()
    if (lastCheck !== today) {
      import('./services/notificationService').then(({ checkUpcomingEpisodes }) =>
        checkUpcomingEpisodes(user.uid).then(() => {
          localStorage.setItem('lastNotifCheck', today)
        })
      )
    }
  }, [user?.uid])

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/show/:id" element={<ShowDetail />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          <Route path="/upcoming" element={<UpcomingPage />} />
          <Route path="/lists" element={<Navigate to="/profile?section=lists" replace />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/history" element={<Navigate to="/profile?section=history" replace />} />
          <Route path="/calendar" element={<Navigate to="/profile?section=history&view=calendar" replace />} />
          <Route path="/stats" element={<Navigate to="/profile?section=stats" replace />} />
          <Route path="/settings" element={<Navigate to="/profile?section=settings" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
