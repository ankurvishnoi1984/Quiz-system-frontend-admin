import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HostLayout from './layouts/HostLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SectionPage from './pages/SectionPage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={() => setIsLoggedIn(true)} />}
        />

        <Route
          element={isLoggedIn ? <HostLayout onLogout={() => setIsLoggedIn(false)} /> : <Navigate to="/login" replace />}
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/builder" element={<SectionPage title="Question Builder" subtitle="Create and organize quiz, poll, and survey questions visually." />} />
          <Route path="/live" element={<SectionPage title="Live Present Mode (Host View)" subtitle="Control question flow and monitor live participation in real time." />} />
          <Route path="/analytics" element={<SectionPage title="Session Analytics" subtitle="Track response rates, engagement insights, and outcome trends." />} />
          <Route path="/reports" element={<SectionPage title="Reports" subtitle="Generate and download detailed reports." />} />
        </Route>

        <Route path="*" element={<Navigate to={isLoggedIn ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
