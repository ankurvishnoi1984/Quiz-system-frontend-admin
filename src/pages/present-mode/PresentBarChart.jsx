import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useElementSize } from '../../hooks/useElementSize'
import { CHART_TOOLTIP_STYLE } from '../../utils/chartColors'
import { CORRECT_STROKE, PresentCorrectBarLabel, PresentXAxisTick } from './PresentAnswerReveal'
import { getPresentOptionColor } from '../../utils/livePresentation'

const CHART_MIN_HEIGHT = 320

export function PresentBarChart({ data, rawType, answerRevealed }) {
  const { ref, width, height, ready } = useElementSize(CHART_MIN_HEIGHT)
  const total = data.reduce((sum, row) => sum + row.value, 0)
  const margin = { top: answerRevealed ? 32 : 16, right: 24, left: 8, bottom: 4 }

  return (
    <div
      ref={ref}
      className="w-full min-w-0 shrink-0"
      style={{ height: 'min(45vh, 480px)', minHeight: CHART_MIN_HEIGHT }}
    >
      {!ready ? (
        <div className="h-full w-full animate-pulse rounded-2xl bg-slate-100/80" aria-hidden />
      ) : (
        <BarChart width={width} height={height} data={data} margin={margin}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            interval={0}
            height={52}
            tickMargin={12}
            tick={(tickProps) => <PresentXAxisTick {...tickProps} chartData={data} />}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 16, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: 'rgba(27, 75, 107, 0.06)' }}
            contentStyle={{ ...CHART_TOOLTIP_STYLE, fontSize: 16 }}
            formatter={(value, name, item) => {
              const pct = total ? Math.round((Number(value) / total) * 100) : 0
              const label = item?.payload?.isCorrect ? `${name} ✓` : name
              return [`${value} (${pct}%)`, label]
            }}
          />
          <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={120}>
            {data.map((entry, idx) => (
              <Cell
                key={entry.name}
                fill={
                  entry.color ?? getPresentOptionColor(entry.name, idx, rawType)
                }
                stroke={entry.isCorrect && answerRevealed ? CORRECT_STROKE : undefined}
                strokeWidth={entry.isCorrect && answerRevealed ? 3 : 0}
              />
            ))}
            {answerRevealed ? (
              <LabelList
                content={(labelProps) => (
                  <PresentCorrectBarLabel
                    {...labelProps}
                    data={data}
                    answerRevealed={answerRevealed}
                  />
                )}
              />
            ) : null}
          </Bar>
        </BarChart>
      )}
    </div>
  )
}
