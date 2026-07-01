import { ArrowDown, ArrowUp, Download, Loader2, Minus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDepartmentReportApi } from '../services/analyticsApi'
import { exportDepartmentAnalyticsExcel } from '../utils/departmentAnalyticsExcelExport'
import { useShell } from '../context/ShellContext'
import { useAuthStore } from '../store/authStore'
import { CHART_TOOLTIP_STYLE } from '../utils/chartColors'

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

function formatDisplayDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function TrendBadge({ value, suffix = '%' }) {
  if (value == null || Number.isNaN(Number(value))) {
    return <span className="text-sm text-slate-500">—</span>
  }
  const num = Number(value)
  const Icon = num > 0 ? ArrowUp : num < 0 ? ArrowDown : Minus
  const color =
    num > 0 ? 'text-emerald-700 bg-emerald-50' : num < 0 ? 'text-red-700 bg-red-50' : 'text-slate-600 bg-slate-100'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      <Icon className="size-3" />
      {num > 0 ? '+' : ''}
      {num}
      {suffix}
    </span>
  )
}

const SORT_KEYS = {
  title: 'title',
  date: 'date',
  host: 'host_name',
  participants: 'participant_count',
  engagement: 'engagement_rate_percent',
}

function DepartmentAnalyticsPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { department, departmentId, departments } = useShell()
  const departmentLabel =
    department ||
    departments.find((d) => String(d.dept_id) === String(departmentId))?.name ||
    'Department'
  const defaults = useMemo(() => defaultDateRange(), [])
  const [fromDate, setFromDate] = useState(defaults.from)
  const [toDate, setToDate] = useState(defaults.to)
  const [appliedRange, setAppliedRange] = useState(defaults)
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [exporting, setExporting] = useState(false)

  const reportQuery = useQuery({
    queryKey: ['department-report', departmentId, appliedRange.from, appliedRange.to],
    queryFn: () =>
      getDepartmentReportApi(accessToken, departmentId, {
        from: appliedRange.from,
        to: appliedRange.to,
      }),
    enabled: Boolean(accessToken && departmentId),
  })

  const report =
    reportQuery.data &&
    String(reportQuery.data.department?.dept_id) === String(departmentId)
      ? reportQuery.data
      : undefined

  const sortedSessions = useMemo(() => {
    const rows = [...(report?.sessions || [])]
    const key = SORT_KEYS[sortKey] || sortKey
    rows.sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]
      if (key === 'date') {
        const aTime = aVal ? new Date(aVal).getTime() : 0
        const bTime = bVal ? new Date(bVal).getTime() : 0
        return sortDir === 'asc' ? aTime - bTime : bTime - aTime
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDir === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''))
    })
    return rows
  }, [report?.sessions, sortKey, sortDir])

  const chartData = useMemo(() => {
    return (report?.monthly_trend || []).map((row) => ({
      label: row.label,
      sessions: row.sessions,
      participants: row.participants,
    }))
  }, [report?.monthly_trend])

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const applyRange = () => {
    setAppliedRange({ from: fromDate, to: toDate })
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const data =
        report ||
        (await getDepartmentReportApi(accessToken, departmentId, {
          from: appliedRange.from,
          to: appliedRange.to,
        }))
      await exportDepartmentAnalyticsExcel(data)
    } catch (error) {
      window.alert(error?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (!departmentId) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600">
        Select a department from the navbar to view department analytics.
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">
            Department Analytics
          </p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">
            {report?.department?.name || departmentLabel} report
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Admin-only overview · default range last 30 days
          </p>
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
          {reportQuery.error.message || 'Failed to load department report'}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: 'Total sessions',
            value: report?.summary?.total_sessions ?? '—',
            trend: report?.summary?.sessions_trend_percent,
            hint: 'vs previous period',
          },
          {
            label: 'Total participants',
            value: report?.summary?.total_participants ?? '—',
            trend: report?.summary?.participants_trend_percent,
            hint: 'Distinct participants',
          },
          {
            label: 'Avg engagement',
            value:
              report?.summary?.avg_engagement_rate_percent != null
                ? `${report.summary.avg_engagement_rate_percent}%`
                : '—',
            trend: report?.summary?.engagement_trend_percent,
            hint: 'Percentage points vs previous',
            suffix: ' pts',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-navy-900">{card.value}</p>
            <div className="mt-2 flex items-center gap-2">
              <TrendBadge value={card.trend} suffix={card.suffix || '%'} />
              <span className="text-xs text-slate-500">{card.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {report?.most_active_host ? (
        <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-800">Most active host</p>
          <p className="mt-1 text-lg font-bold text-navy-900">
            {report.most_active_host.host_name}{' '}
            <span className="text-base font-semibold text-slate-600">
              · {report.most_active_host.session_count} session
              {report.most_active_host.session_count === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm">
        <p className="text-sm font-semibold text-navy-900">Month-over-month activity</p>
        <p className="text-xs text-slate-600">Sessions and participants within the selected range</p>
        <div className="mt-4 h-72">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="sessions" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="participants" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              No session activity in this date range.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm">
        <p className="text-sm font-semibold text-navy-900">Sessions</p>
        <p className="text-xs text-slate-600">Click column headers to sort</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60 text-left">
                {[
                  ['title', 'Title'],
                  ['date', 'Date'],
                  ['host', 'Host'],
                  ['participants', 'Participants'],
                  ['engagement', 'Engagement'],
                ].map(([key, label]) => (
                  <th key={key} className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="font-semibold text-slate-700 hover:text-navy-900"
                    >
                      {label}
                      {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map((row) => (
                <tr key={row.session_id} className="border-b border-blue-50 last:border-b-0">
                  <td className="px-3 py-2.5 font-semibold text-navy-900">{row.title}</td>
                  <td className="px-3 py-2.5 text-slate-700">{formatDisplayDate(row.date)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.host_name}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.participant_count}</td>
                  <td className="px-3 py-2.5 font-semibold text-navy-900">{row.engagement_rate_percent}%</td>
                </tr>
              ))}
              {!sortedSessions.length && !reportQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-600">
                    No sessions in this date range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default DepartmentAnalyticsPage
