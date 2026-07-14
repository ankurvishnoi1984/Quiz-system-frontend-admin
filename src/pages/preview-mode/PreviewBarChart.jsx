import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'
import { useElementSize } from '../../hooks/useElementSize'
import { getPresentOptionColor } from '../../utils/livePresentation'

function ValueLabel(props) {
  const { x, y, width, value, viewBox } = props
  if (value == null || Number(value) <= 0) return null
  const barHeight = viewBox?.height ?? 0
  const placeInside = barHeight > 48
  return (
    <text
      x={x + width / 2}
      y={placeInside ? y + 28 : y - 12}
      fill={placeInside ? '#ffffff' : '#0a1f2e'}
      textAnchor="middle"
      fontSize={Math.max(18, Math.min(28, width * 0.22))}
      fontWeight={700}
    >
      {value}
    </text>
  )
}

export function PreviewBarChart({ data, rawType }) {
  const { ref, width, height, ready } = useElementSize(280)
  const margin = { top: 36, right: 16, left: 8, bottom: 12 }

  return (
    <div ref={ref} className="h-full min-h-0 w-full min-w-0 flex-1">
      {!ready ? (
        <div className="h-full w-full animate-pulse rounded-3xl bg-white/40" aria-hidden />
      ) : (
        <BarChart width={width} height={height} data={data} margin={margin}>
          <CartesianGrid strokeDasharray="4 8" stroke="#cbd5e1" vertical={false} strokeOpacity={0.55} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            interval={0}
            height={64}
            tickMargin={14}
            tick={{ fontSize: Math.max(16, Math.min(22, width / (data.length * 6 || 12))), fill: '#1e293b', fontWeight: 600 }}
          />
          <YAxis hide allowDecimals={false} />
          <Bar
            dataKey="value"
            radius={[16, 16, 0, 0]}
            maxBarSize={Math.min(160, Math.max(72, width / (data.length * 1.6 || 4)))}
            isAnimationActive
            animationBegin={80}
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((entry, idx) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? getPresentOptionColor(entry.name, idx, rawType)}
              />
            ))}
            <LabelList content={<ValueLabel />} />
          </Bar>
        </BarChart>
      )}
    </div>
  )
}
