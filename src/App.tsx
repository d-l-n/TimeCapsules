import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Loading from './components/Loading'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ShowDetail from './pages/ShowDetail'
import DiscoverPage from './pages/DiscoverPage'
import ProfilePage from './pages/ProfilePage'
import GroupsPage from './pages/GroupsPage'
import LibraryPage from './pages/LibraryPage'
import GroupDetail from './pages/GroupDetail'
import UpcomingPage from './pages/UpcomingPage'
import ListDetail from './pages/ListDetail'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
