import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Building2,
  ChartColumnBig,
  CirclePlay,
  FileBarChart2,
  FileQuestion,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useHostNavSessions, getBuilderNavTo, getLiveNavTo } from '../../hooks/useHostNavSessions'
import { useAuthStore } from '../../store/authStore'
import { isAdminRole } from '../../utils/adminRoles'

const staticNavigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, kind: 'static' },
  { kind: 'builder', label: 'Question Builder', icon: FileQuestion, isNew: true },
  { kind: 'live', label: 'Live Present Mode', icon: CirclePlay, live: true },
  { to: '/analytics', label: 'Session Analytics', icon: ChartColumnBig, kind: 'static' },
  { to: '/department-analytics', label: 'Department Analytics', icon: Building2, kind: 'static', adminOnly: true },
  { to: '/reports', label: 'Reports', icon: FileBarChart2, kind: 'static' },
]

function Sidebar({ collapsed, onToggle }) {
  const user = useAuthStore((state) => state.user)
  const sessionsQuery = useHostNavSessions()
  const sessions = sessionsQuery.data

  const builderTo = useMemo(() => getBuilderNavTo(sessions), [sessions])
  const liveTo = useMemo(() => getLiveNavTo(sessions), [sessions])

  const navigationItems = useMemo(
    () =>
      staticNavigationItems
        .filter((item) => !item.adminOnly || isAdminRole(user?.role))
        .map((item) => {
          if (item.kind === 'builder') return { ...item, to: builderTo }
          if (item.kind === 'live') return { ...item, to: liveTo }
          return item
        }),
    [builderTo, liveTo, user?.role],
  )

  return (
    <aside
      data-host-sidebar
      className={`relative z-20 border-r border-navy-700/70 bg-linear-to-b from-navy-950 via-navy-900 to-navy-800 text-slate-100 shadow-2xl shadow-navy-950/30 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? 'w-0' : 'w-auto'}`}>
  <div className="grid size-12 place-items-center rounded-xl bg-white p-1">
  <img
    src="/icon.png"
    alt="Logo"
    className="h-full w-full object-contain"
  />
</div>
          {!collapsed && (
            <div>
              <p className="text-xs text-blue-200/80">Admin Portal</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg border border-white/20 p-1.5 text-blue-100 transition hover:bg-white/10"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="space-y-1 p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const navKey = item.kind === 'builder' ? 'nav-builder' : item.kind === 'live' ? 'nav-live' : item.to
          return (
            <NavLink
              key={navKey}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/18 text-white'
                    : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {item.live && <span className="rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-semibold text-red-100">LIVE</span>}
                    {item.isNew && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-red-100">NEW</span>}
                  </div>
                </>
              )}
              {collapsed && item.live && <span className="ml-auto size-2 rounded-full bg-red-500" />}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
