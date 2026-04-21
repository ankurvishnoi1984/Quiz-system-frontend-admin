import { NavLink } from 'react-router-dom'
import {
  ChartColumnBig,
  CirclePlay,
  FileBarChart2,
  FileQuestion,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/builder', label: 'Question Builder', icon: FileQuestion, isNew: true },
  { to: '/live', label: 'Live Present Mode', icon: CirclePlay, live: true },
  { to: '/analytics', label: 'Session Analytics', icon: ChartColumnBig },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
]

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={`relative z-20 border-r border-navy-700/70 bg-linear-to-b from-navy-900 via-navy-800 to-blue-900 text-slate-100 shadow-2xl shadow-navy-950/30 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? 'w-0' : 'w-auto'}`}>
          <div className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-cyan-400 to-blue-500 text-navy-950">
            Q
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white">Quiz Host</p>
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
          return (
            <NavLink
              key={item.to}
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
                    {item.live && <span className="rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-semibold text-red-100">LIVE</span>}
                    {item.isNew && <span className="rounded-full bg-cyan-300/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">NEW</span>}
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
