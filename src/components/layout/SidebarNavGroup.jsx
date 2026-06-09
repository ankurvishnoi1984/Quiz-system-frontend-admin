import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

export function SidebarNavGroup({ label, icon: Icon, items, collapsed }) {
  const location = useLocation()
  const isGroupActive = items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )
  const [open, setOpen] = useState(isGroupActive)

  useEffect(() => {
    if (isGroupActive) setOpen(true)
  }, [isGroupActive])

  if (collapsed) {
    return (
      <NavLink
        to={items[0]?.to || '#'}
        title={label}
        className={({ isActive }) =>
          `group flex items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive || isGroupActive
              ? 'bg-white/18 text-white'
              : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
          }`
        }
      >
        <Icon className="size-4 shrink-0" />
      </NavLink>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isGroupActive
            ? 'bg-white/18 text-white'
            : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`ml-auto size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="ml-4 space-y-1 border-l border-white/15 pl-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  )
}
