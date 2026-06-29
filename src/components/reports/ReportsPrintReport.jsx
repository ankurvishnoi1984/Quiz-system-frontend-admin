import { ReportPrintHeader } from './ReportPrintHeader'

export function ReportsPrintReport({ sessions, filters }) {
  const generatedAt = new Date().toLocaleString()
  const totalParticipants = sessions.reduce((sum, session) => sum + (session.participants ?? 0), 0)

  return (
    <>
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
        <table className="report-print-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Status</th>
              <th>Participants</th>
              <th>Date</th>
              <th>Join</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <p className="report-print-cell-title">{session.title}</p>
                  <p className="report-print-cell-sub">{session.id}</p>
                </td>
                <td className="report-print-capitalize">{session.status}</td>
                <td>{(session.participants ?? 0).toLocaleString()}</td>
                <td>{session.date ?? '—'}</td>
                <td>{session.joinRequirement ?? 'name'}</td>
              </tr>
            ))}
            {!sessions.length ? (
              <tr>
                <td colSpan={5} className="report-print-empty">
                  No sessions match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  )
}
