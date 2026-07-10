import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_TOOLTIP_STYLE } from '../../utils/chartColors'
import { renderPieLabel } from '../charts/renderPieLabel'
import MonitorChartCard from './MonitorChartCard'
import {
  buildAuthChartData,
  buildHistoryChartData,
  buildRoleChartData,
  buildSessionChartData,
} from '../../utils/websocketMonitor'

export function WebSocketMonitorCharts({ monitor, isLoading }) {
  const historyData = useMemo(() => buildHistoryChartData(monitor?.history), [monitor?.history])
  const roleData = useMemo(() => buildRoleChartData(monitor?.by_role), [monitor?.by_role])
  const authData = useMemo(() => buildAuthChartData(monitor?.by_auth_status), [monitor?.by_auth_status])
  const sessionData = useMemo(
    () => buildSessionChartData(monitor?.sessions),
    [monitor?.sessions],
  )

  const hasHistory = historyData.length > 1
  const hasRoles = roleData.some((row) => row.value > 0)
  const hasAuth = authData.some((row) => row.value > 0)
  const hasSessions = sessionData.some((row) => row.connections > 0)

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <MonitorChartCard
        title="Connections over time"
        description="Live socket count sampled on each refresh (last ~10 minutes)"
        isLoading={isLoading}
        hasData={hasHistory}
        emptyMessage="History will appear after a few refresh cycles."
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={historyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} width={36} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="total"
              name="Connections"
              stroke="#1B4B6B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="sessions"
              name="Sessions"
              stroke="#2A6585"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </MonitorChartCard>

      <MonitorChartCard
        title="Connections by role"
        description="Open sockets grouped by client role"
        isLoading={isLoading}
        hasData={hasRoles}
        emptyMessage="No active WebSocket connections right now."
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={roleData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={2}
              label={renderPieLabel}
            >
              {roleData.map((entry) => (
                <Cell key={entry.role} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </MonitorChartCard>

      <MonitorChartCard
        title="Top sessions"
        description="Sessions with the most open sockets"
        isLoading={isLoading}
        hasData={hasSessions}
        emptyMessage="No sessions with active connections."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={sessionData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10, fill: '#64748B' }}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="connections" name="Connections" fill="#1B4B6B" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </MonitorChartCard>

      <MonitorChartCard
        title="Authentication status"
        description="How current sockets authenticated at handshake"
        isLoading={isLoading}
        hasData={hasAuth}
        emptyMessage="No authentication data for active connections."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={authData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748B' }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={64}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} width={32} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="value" name="Connections" radius={[6, 6, 0, 0]}>
              {authData.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </MonitorChartCard>
    </div>
  )
}
