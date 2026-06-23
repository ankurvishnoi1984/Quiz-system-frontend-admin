import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminOnlyRoute } from './components/auth/AdminOnlyRoute'
import { SuperAdminOnlyRoute } from './components/auth/SuperAdminOnlyRoute'
import DepartmentAnalyticsPage from './pages/DepartmentAnalyticsPage'
import ClientAnalyticsPage from './pages/ClientAnalyticsPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ForceChangePasswordPage from './pages/ForceChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import BuilderPage from './pages/BuilderPage'
import LivePage from './pages/LivePage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReportsPage from './pages/ReportsPage'
import ManageClientsPage from './pages/ManageClientsPage'
import ManageDepartmentsPage from './pages/ManageDepartmentsPage'
import ManageUsersPage from './pages/ManageUsersPage'
import ParticipantSessionPage from './pages/participant-session'
import PresentModePage from './pages/present-mode'
import { SessionsProvider } from './context/SessionsContext'
import { useAuthStore } from './store/authStore'
import HostLayout from './layouts/HostLayout'

function getPostLoginPath(user) {
  if (user?.must_change_password) {
    return '/change-password'
  }
  return '/dashboard'
}

function App() {
  const user = useAuthStore((state) => state.user)
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth)
  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setAuthHydrated(true)
    })
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!authHydrated) return
    bootstrapAuth()
  }, [authHydrated, bootstrapAuth])

  if (!authHydrated || isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/70">
        <p className="text-sm font-medium text-slate-600">Checking session...</p>
      </div>
    )
  }

  const mustChangePassword = Boolean(user?.must_change_password)
  const postLoginPath = getPostLoginPath(user)

  return (
    <SessionsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/join/:sessionId" element={<ParticipantSessionPage />} />
          <Route path="/join" element={<ParticipantSessionPage />} />
          <Route
            path="/present"
            element={
              user && !mustChangePassword ? (
                <PresentModePage />
              ) : (
                <Navigate to={user ? '/change-password' : '/login'} replace />
              )
            }
          />
          <Route
            path="/login"
            element={user ? <Navigate to={postLoginPath} replace /> : <LoginPage />}
          />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to={postLoginPath} replace /> : <ForgotPasswordPage />}
          />
          <Route
            path="/change-password"
            element={
              !user ? (
                <Navigate to="/login" replace />
              ) : mustChangePassword ? (
                <ForceChangePasswordPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route
            element={
              user ? (
                mustChangePassword ? (
                  <Navigate to="/change-password" replace />
                ) : (
                  <HostLayout />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/builder" element={<BuilderPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route
              path="/department-analytics"
              element={
                <AdminOnlyRoute>
                  <DepartmentAnalyticsPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/client-analytics"
              element={
                <SuperAdminOnlyRoute>
                  <ClientAnalyticsPage />
                </SuperAdminOnlyRoute>
              }
            />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/manage/clients"
              element={
                <SuperAdminOnlyRoute>
                  <ManageClientsPage />
                </SuperAdminOnlyRoute>
              }
            />
            <Route
              path="/manage/departments"
              element={
                <AdminOnlyRoute>
                  <ManageDepartmentsPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/manage/users"
              element={
                <SuperAdminOnlyRoute>
                  <ManageUsersPage />
                </SuperAdminOnlyRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to={user ? postLoginPath : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </SessionsProvider>
  )
}

export default App
