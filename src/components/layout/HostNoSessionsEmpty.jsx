export function HostNoSessionsEmpty({ pageLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
      <p className="text-lg font-semibold text-navy-900">No sessions found</p>
      <p className="mt-2 text-sm">
        {pageLabel ? (
          <>
            There are no sessions. Go to <strong>Dashboard</strong> and create
            one to use {pageLabel}.
          </>
        ) : (
          <>There are no sessions. Create one to get started.</>
        )}
      </p>
    </div>
  )
}
