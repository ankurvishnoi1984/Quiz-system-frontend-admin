import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildStatusChartData,
  buildWeeklyBuckets,
} from '../../utils/dashboardMetrics'
import { CHART_TOOLTIP_STYLE } from '../../utils/chartColors'
import { DashboardRecentEngagement } from './DashboardRecentEngagement'

function ChartCard({ title, description, children, isLoading }) {
  return (
    <div className="flex min-h-[280px] flex-col rounded-2xl border border-blue-200/70 bg-white/90 p-4 shadow-sm shadow-blue-900/5">
      <div className="mb-3 shrink-0">
        <h3 className="text-sm font-bold text-navy-900">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-500">
            Loading charts…
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function EmptyChartMessage({ message }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-blue-200/80 bg-blue-50/40 px-4 text-center text-sm text-slate-600">
      {message}
    </div>
  )
}

export function DashboardChartsPanel({ sessions = [], isLoading = false }) {
  const weeklyActivity = useMemo(() => buildWeeklyBuckets(sessions, 8), [sessions])
  const statusData = useMemo(() => buildStatusChartData(sessions), [sessions])

  const hasWeeklyData = weeklyActivity.some((row) => row.sessions > 0 || row.participants > 0)
  const hasStatusData = statusData.length > 0

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartCard
        title="Weekly activity"
        description="Sessions created and participants joined (last 8 weeks)"
        isLoading={isLoading}
      >
        {!hasWeeklyData ? (
          <EmptyChartMessage message="Create sessions to see weekly trends." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyActivity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} width={32} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sessions" name="Sessions" fill="#1B4B6B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="participants" name="Participants" fill="#2A6585" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Session status"
        description="Current mix across your department"
        isLoading={isLoading}
      >
        {!hasStatusData ? (
          <EmptyChartMessage message="No sessions in this department yet." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Recent session engagement"
        description="Latest 6 sessions — joined, finished, and completion rate"
        isLoading={isLoading}
      >
        <DashboardRecentEngagement sessions={sessions} isLoading={isLoading} />
      </ChartCard>
    </div>
  )
}
