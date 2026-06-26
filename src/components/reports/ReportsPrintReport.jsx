import { ReportPrintHeader } from './ReportPrintHeader'

export function ReportsPrintReport({ sessions, filters }) {
  const generatedAt = new Date().toLocaleString()
  const totalParticipants = sessions.reduce((sum, session) => sum + (session.participants ?? 0), 0)

  return (
    <div className="host-print-only hidden bg-white text-slate-900">
      <ReportPrintHeader reportLabel="Session Reports" title="Session report index">
        <p>
          {sessions.length} session{sessions.length === 1 ? '' : 's'} ·{' '}
          {totalParticipants.toLocaleString()} total participants
        </p>
        <p>
          Filters: {filters.status} · {filters.search || 'All sessions'}
          {filters.dateRange ? ` · ${filters.dateRange}` : ''}
        </p>
        <p>Generated {generatedAt}</p>
      </ReportPrintHeader>

      <section className="report-print-section">
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2 pr-3 font-semibold">Session</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 pr-3 font-semibold">Participants</th>
              <th className="py-2 pr-3 font-semibold">Date</th>
              <th className="py-2 font-semibold">Join</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3">
                  <p className="font-semibold text-slate-900">{session.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{session.id}</p>
                </td>
                <td className="py-2 pr-3 capitalize">{session.status}</td>
                <td className="py-2 pr-3">{(session.participants ?? 0).toLocaleString()}</td>
                <td className="py-2 pr-3">{session.date ?? '—'}</td>
                <td className="py-2">{session.joinRequirement ?? 'name'}</td>
              </tr>
            ))}
            {!sessions.length ? (
              <tr>
                <td colSpan={5} className="py-4 text-slate-500">
                  No sessions match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  )
}
