import { ChevronDown, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useShell } from '../../context/ShellContext'
import { useAuthStore } from '../../store/authStore'
import { canSwitchShellDepartment } from '../../utils/adminRoles'
import { isShellFilterDisabled } from '../../utils/shellFilterPaths'

const pageTitles = {
  '/dashboard': 'Admin Dashboard',
  '/builder': 'Question Builder',
  '/live': 'Live Present Mode',
  '/analytics': 'Session Analytics',
  '/department-analytics': 'Department Analytics',
  '/client-analytics': 'Client Analytics',
  '/reports': 'Reports',
  '/manage/clients': 'Manage Clients',
  '/manage/departments': 'Manage Departments',
  '/manage/users': 'User Management',
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { pathname } = useLocation()
  const { client, setClient, clientId, setClientId, department, setDepartment, departmentId, setDepartmentId, clients, departments, isSuperAdmin, clientsLoading, departmentsLoading } = useShell()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const shellFiltersDisabled = isShellFilterDisabled(pathname)
  const canSwitchDepartment = canSwitchShellDepartment(user?.role)
  const departmentLabel =
    department ||
    departments.find((d) => String(d.dept_id) === String(departmentId))?.name ||
    'Department'

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
    <header
      data-host-navbar
      className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-blue-200/70 bg-white/70 px-6 backdrop-blur-xl"
    >
      <div className="min-w-0 pr-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-700">Host Workspace</p>
        <h1 className="text-lg font-semibold text-navy-900">{pageTitles[pathname] ?? 'Quiz Management System'}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {!shellFiltersDisabled ? (
          <div
            className="hidden items-center gap-4 md:flex"
            role="group"
            aria-label="Filter workspace data"
          >
            {isSuperAdmin && !clientsLoading && clients.length > 0 ? (
              <label htmlFor="shell-filter-client" className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">Client:</span>
                <select
                  id="shell-filter-client"
                  value={clientId}
                  onChange={(event) => {
                    const selectedClient = clients.find((c) => String(c.client_id) === event.target.value)
                    if (selectedClient) {
                      setClientId(String(selectedClient.client_id))
                      setClient(selectedClient.name)
                    }
                  }}
                  className="h-9 min-w-32 rounded-lg border border-blue-200/70 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                >
                  {clients.map((c) => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {!departmentsLoading && (departments.length > 0 || departmentLabel) ? (
              canSwitchDepartment ? (
                <label htmlFor="shell-filter-department" className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Department:</span>
                  <select
                    id="shell-filter-department"
                    value={departmentId}
                    onChange={(event) => {
                      const selectedDept = departments.find((d) => String(d.dept_id) === event.target.value)
                      if (selectedDept) {
                        setDepartmentId(String(selectedDept.dept_id))
                        setDepartment(selectedDept.name)
                      }
                    }}
                    className="h-9 min-w-32 rounded-lg border border-blue-200/70 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  >
                    {departments.map((d) => (
                      <option key={d.dept_id} value={d.dept_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Department</span>
                  <div
                    className="flex h-9 min-w-32 items-center rounded-lg border border-blue-200/70 bg-slate-50 px-3 text-sm font-medium text-slate-700 shadow-sm"
                    aria-label={`Department: ${departmentLabel}`}
                  >
                    {departmentLabel}
                  </div>
                </div>
              )
            ) : null}
          </div>
        ) : null}

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-blue-900/5 transition hover:bg-blue-50"
        >
          <span className="grid size-7 place-items-center rounded-full bg-linear-to-br from-navy-900 to-navy-600 text-xs font-semibold text-white">
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