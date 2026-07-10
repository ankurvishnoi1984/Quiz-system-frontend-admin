function MonitorChartCard({ title, description, children, isLoading, emptyMessage, hasData = true }) {
  return (
    <div className="flex min-h-[300px] flex-col rounded-2xl border border-blue-200/70 bg-white/90 p-4 shadow-sm shadow-blue-900/5">
      <div className="mb-3 shrink-0">
        <h3 className="text-sm font-bold text-navy-900">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-slate-500">
            Loading chart…
          </div>
        ) : !hasData ? (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-blue-200/80 bg-blue-50/40 px-4 text-center text-sm text-slate-600">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

export default MonitorChartCard
