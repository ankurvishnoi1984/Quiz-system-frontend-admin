import { ChevronDown, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useShell } from '../../context/ShellContext'
import { useAuthStore } from '../../store/authStore'

const pageTitles = {
  '/dashboard': 'Admin Dashboard',
  '/builder': 'Question Builder',
  '/live': 'Live Present Mode',
  '/analytics': 'Session Analytics',
  '/reports': 'Reports',
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { pathname } = useLocation()
  const { client, setClient, clientId, setClientId, department, setDepartment, departmentId, setDepartmentId, clients, departments, isSuperAdmin, clientsLoading, departmentsLoading } = useShell()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'US'

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-blue-200/70 bg-white/70 px-6 backdrop-blur-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">Host Workspace</p>
        <h1 className="text-lg font-semibold text-navy-900">{pageTitles[pathname] ?? 'Quiz Management System'}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 md:flex">
          {isSuperAdmin && !clientsLoading && clients.length > 0 && (
            <select
              value={clientId}
              onChange={(event) => {
                const selectedClient = clients.find(c => String(c.client_id) === event.target.value)
                if (selectedClient) {
                  setClientId(String(selectedClient.client_id))
                  setClient(selectedClient.name)
                }
              }}
              className="h-10 rounded-xl border border-blue-200/70 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="Client"
            >
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {!departmentsLoading && departments.length > 0 && (
            <select
              value={departmentId}
              onChange={(event) => {
                const selectedDept = departments.find(d => String(d.dept_id) === event.target.value)
                if (selectedDept) {
                  setDepartmentId(String(selectedDept.dept_id))
                  setDepartment(selectedDept.name)
                }
              }}
              className="h-10 rounded-xl border border-blue-200/70 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="Department"
            >
              {departments.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-blue-900/5 transition hover:bg-blue-50"
        >
          <span className="grid size-7 place-items-center rounded-full bg-linear-to-br from-navy-900 to-blue-700 text-xs font-semibold text-white">
            {initials}
          </span>
          {user?.full_name || 'User'}
          <ChevronDown className="size-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-blue-200/70 bg-white p-1 shadow-xl shadow-blue-900/15">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  )
}

export default Navbar