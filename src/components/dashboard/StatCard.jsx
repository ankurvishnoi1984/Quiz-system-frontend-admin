import Sparkline from '../ui/Sparkline'

function StatCard({ label, value, trendLabel, sparkline, accent = 'blue', pulse = false }) {
  const accentClasses = {
    blue: 'from-blue-600 to-indigo-600',
    cyan: 'from-cyan-600 to-blue-600',
    indigo: 'from-indigo-600 to-blue-700',
    navy: 'from-navy-900 to-blue-700',
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-200/70 bg-white/80 p-4 shadow-sm shadow-blue-900/5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/10">
      <div className={`pointer-events-none absolute -right-12 -top-10 h-24 w-24 rounded-full bg-linear-to-br ${accentClasses[accent] ?? accentClasses.blue} opacity-18 blur-2xl`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="mt-2 flex items-center gap-2">
            {pulse && (
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-45" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            <p className="text-2xl font-bold text-navy-900">{value}</p>
          </div>
        </div>
        <div className="text-right">
          <Sparkline points={sparkline} stroke={accent === 'cyan' ? '#0891b2' : accent === 'navy' ? '#1d4ed8' : '#2563eb'} />
          <p className="mt-1 text-[11px] text-slate-500">{trendLabel}</p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-10 border-t border-blue-200/70 bg-white/90 px-4 py-3 text-xs text-slate-600 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
        {trendLabel}
      </div>
    </div>
  )
}

export default StatCard

