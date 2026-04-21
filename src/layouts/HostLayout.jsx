import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import { ShellProvider } from '../context/ShellContext'
import { SessionsProvider } from '../context/SessionsContext'

function HostLayout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ShellProvider>
      <SessionsProvider>
        <div className="relative flex min-h-screen overflow-hidden bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/70">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.10),transparent_35%),radial-gradient(circle_at_12%_72%,rgba(14,116,144,0.10),transparent_35%)]" />
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
          <div className="relative z-10 flex min-w-0 flex-1 flex-col">
            <Navbar onLogout={onLogout} />
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SessionsProvider>
    </ShellProvider>
  )
}

export default HostLayout
