import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HostLayout from './layouts/HostLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BuilderPage from './pages/BuilderPage'
import LivePage from './pages/LivePage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReportsPage from './pages/ReportsPage'
import ParticipantSessionPage from './pages/ParticipantSessionPage'
import { SessionsProvider } from './context/SessionsContext'
import { useAuthStore } from './store/authStore'

function App() {
  const user = useAuthStore((state) => state.user)
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth)

  useEffect(() => {
    bootstrapAuth()
  }, [bootstrapAuth])

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/70">
        <p className="text-sm font-medium text-slate-600">Checking session...</p>
      </div>
    )
  }

  return (
    <SessionsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join/:sessionId" element={<ParticipantSessionPage />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />

        <Route element={user ? <HostLayout /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
    </SessionsProvider>
  )
}

export default App
