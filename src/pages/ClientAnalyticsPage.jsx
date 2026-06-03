import { Download, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getClientReportApi } from '../services/analyticsApi'
import { exportClientAnalyticsExcel } from '../utils/clientAnalyticsExcelExport'
import { useShell } from '../context/ShellContext'
import { useAuthStore } from '../store/authStore'
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from '../utils/chartColors'

function formatInputDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: formatInputDate(from), to: formatInputDate(to) }
}

function ClientAnalyticsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { client, clientId } = useShell()
  const defaults = useMemo(() => defaultDateRange(), [])
  const [fromDate, setFromDate] = useState(defaults.from)
  const [toDate, setToDate] = useState(defaults.to)
  const [appliedRange, setAppliedRange] = useState(defaults)
  const [exporting, setExporting] = useState(false)

  const reportQuery = useQuery({
    queryKey: ['client-report', clientId, appliedRange.from, appliedRange.to],
    queryFn: () =>
      getClientReportApi(accessToken, clientId, {
        from: appliedRange.from,
        to: appliedRange.to,
      }),
    enabled: Boolean(accessToken && clientId),
  })

  const report = reportQuery.data

  const comparisonChart = useMemo(() => {
    return (report?.department_comparison || []).map((row, index) => ({
      name: row.dept_name,
      engagement: row.engagement_rate_percent,
      sessions: row.session_count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }, [report?.department_comparison])

  const applyRange = () => {
    setAppliedRange({ from: fromDate, to: toDate })
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const data =
        report ||
        (await getClientReportApi(accessToken, clientId, {
          from: appliedRange.from,
          to: appliedRange.to,
        }))
      await exportClientAnalyticsExcel(data)
    } catch (error) {
      window.alert(error?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600">
        Select a client from the navbar to view client-level analytics.
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">
            Client Aggregated Report
          </p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">{client || 'Client'} overview</h2>
          <p className="mt-1 text-sm text-slate-600">Super admin only · all departments</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || reportQuery.isLoading}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export Excel
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-blue-200/70 bg-white/90 p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-xl border border-blue-200/70 px-3 text-sm text-slate-700"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-xl border border-blue-200/70 px-3 text-sm text-slate-700"
          />
        </label>
        <button
          type="button"
          onClick={applyRange}
          className="h-10 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-navy-800 transition hover:bg-blue-50"
        >
          Apply range
        </button>
        {reportQuery.isFetching ? (
          <span className="inline-flex items-center gap-1 text-sm text-navy-600">
            <Loader2 className="size-4 animate-spin" />
            Updating…
          </span>
        ) : null}
      </div>

      {reportQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {reportQuery.error.message || 'Failed to load client report'}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total sessions</p>
          <p className="mt-2 text-2xl font-bold text-navy-900">{report?.summary?.total_sessions ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-600">Across all departments</p>
        </div>
        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total participants</p>
          <p className="mt-2 text-2xl font-bold text-navy-900">{report?.summary?.total_participants ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-600">Distinct across client</p>
        </div>
        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Host utilization</p>
          <p className="mt-2 text-2xl font-bold text-navy-900">
            {report?.summary?.host_utilization
              ? `${report.summary.host_utilization.active_hosts} / ${report.summary.host_utilization.total_hosts}`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {report?.summary?.host_utilization?.utilization_percent != null
              ? `${report.summary.host_utilization.utilization_percent}% active in range`
              : 'Active hosts in date range'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm">
          <p className="text-sm font-semibold text-navy-900">Department engagement comparison</p>
          <p className="text-xs text-slate-600">Average engagement rate per department</p>
          <div className="mt-4 h-72">
            {comparisonChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChart} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value, _name, props) => [
                      `${value}% (${props.payload.sessions} sessions)`,
                      'Engagement',
                    ]}
                  />
                  <Bar dataKey="engagement" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {comparisonChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">
                No department activity in this range.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm">
          <p className="text-sm font-semibold text-navy-900">Top 3 departments</p>
          <p className="text-xs text-slate-600">By session count in range</p>
          <ol className="mt-4 space-y-3">
            {(report?.top_departments || []).map((dept, index) => (
              <li
                key={dept.dept_id}
                className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-navy-800">#{index + 1}</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {dept.session_count} sessions
                  </span>
                </div>
                <p className="mt-1 font-semibold text-navy-900">{dept.dept_name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {dept.participant_count} participants · {dept.engagement_rate_percent}% engagement
                </p>
              </li>
            ))}
            {!report?.top_departments?.length && !reportQuery.isLoading ? (
              <li className="text-sm text-slate-600">No department data yet.</li>
            ) : null}
          </ol>
        </div>
      </div>
    </section>
  )
}

export default ClientAnalyticsPage
