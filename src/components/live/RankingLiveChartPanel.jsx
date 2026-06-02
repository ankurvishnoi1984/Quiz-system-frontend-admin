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
import { useMemo } from 'react'
import { renderPieLabel } from '../charts/renderPieLabel'
import { CHART_TOOLTIP_STYLE, getChartColor } from '../../utils/chartColors'

function buildRankingChartData(rankings) {
  return (rankings || []).map((row, idx) => ({
    name: row.optionText,
    value: Number(row.averageScore) || 0,
    rank: row.rank ?? idx + 1,
    totalScore: row.totalScore,
    averageRank: row.averageRank,
  }))
}

export function RankingLiveChartPanel({ rankings, chartView }) {
  const chartData = useMemo(() => buildRankingChartData(rankings), [rankings])
  const chartTotal = chartData.reduce((sum, row) => sum + row.value, 0)

  if (chartView === 'table') {
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-blue-100">
              <th className="px-3 py-2 font-semibold text-slate-700">Rank</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Option</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Score</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Avg Score</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Avg Rank</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((row) => (
              <tr key={row.optionId} className="border-b border-blue-50 last:border-b-0">
                <td className="px-3 py-2 font-semibold text-navy-900">{row.rank}</td>
                <td className="px-3 py-2 text-slate-700">{row.optionText}</td>
                <td className="px-3 py-2 text-slate-700">{row.totalScore}</td>
                <td className="px-3 py-2 text-slate-700">{row.averageScore}</td>
                <td className="px-3 py-2 text-slate-700">{row.averageRank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartView === 'bar' ? (
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }}
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value) => [`${value} avg score`, 'Average score']}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
            {chartData.map((entry, idx) => (
              <Cell key={entry.name} fill={getChartColor(entry.name, idx, 'ranking')} />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <PieChart>
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value, name) => [
              `${value} (${chartTotal ? Math.round((Number(value) / chartTotal) * 100) : 0}%) avg score`,
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            formatter={(value) => <span className="text-xs font-medium text-slate-600">{value}</span>}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={92}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
            label={renderPieLabel}
            labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
          >
            {chartData.map((entry, idx) => (
              <Cell key={entry.name} fill={getChartColor(entry.name, idx, 'ranking')} />
            ))}
          </Pie>
        </PieChart>
      )}
    </ResponsiveContainer>
  )
}
