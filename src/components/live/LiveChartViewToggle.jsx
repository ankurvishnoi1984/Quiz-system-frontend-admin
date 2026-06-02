import { BarChart3, PieChart as PieChartIcon, Table } from 'lucide-react'

const MODE_CONFIG = {
  table: { icon: Table, label: 'Table' },
  bar: { icon: BarChart3, label: 'Bar' },
  pie: { icon: PieChartIcon, label: 'Pie' },
}

export function LiveChartViewToggle({ view, onChange, modes = ['bar', 'pie'] }) {
  return (
    <div className="inline-flex rounded-xl border border-blue-200/70 bg-white p-0.5 shadow-sm">
      {modes.map((mode) => {
        const config = MODE_CONFIG[mode]
        if (!config) return null
        const Icon = config.icon
        const isActive = view === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow'
                : 'text-slate-600 hover:bg-blue-50'
            }`}
            aria-pressed={isActive}
          >
            <Icon className="size-3.5" />
            {config.label}
          </button>
        )
      })}
    </div>
  )
}
