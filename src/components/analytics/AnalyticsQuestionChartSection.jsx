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
import WordCloudChart from '../charts/WordCloudChart'
import { renderPieLabel } from '../charts/renderPieLabel'
import { LiveChartViewToggle } from '../live/LiveChartViewToggle'
import { RankingLiveChartPanel } from '../live/RankingLiveChartPanel'
import { OpenTextResponsesList } from './OpenTextResponsesList'
import { EmojiBarChart } from '../emoji/EmojiBarChart'
import { CHART_TOOLTIP_STYLE, getChartColor, RESPONSE_RATE_PIE_COLORS } from '../../utils/chartColors'
import { questionUsesEmojiChart, questionUsesOptionChart } from '../../utils/livePresentation'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function McqAnalyticsBarChart({ question }) {
  const chartType = question.chartRawType || question.rawType
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={question.chart} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis unit="%" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }}
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value, _name, props) => [`${value}% (${props.payload.count} responses)`, 'Share']}
        />
        <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={56}>
          {question.chart.map((entry, idx) => (
            <Cell key={entry.name} fill={getChartColor(entry.name, idx, chartType)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function RatingAnalyticsBarChart({ question }) {
  const chartType = question.chartRawType || question.rawType
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={question.chart} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }}
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value, _name, props) => [`${props.payload.count} responses`, 'Count']}
        />
        <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={56}>
          {question.chart.map((entry, idx) => (
            <Cell key={entry.name} fill={getChartColor(entry.name, idx, chartType)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function ResponseRatePieChart({ question, participantsJoined }) {
  const respondedPct = clamp(
    Math.round((question.responseCount / Math.max(1, participantsJoined)) * 100),
    0,
    100,
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend
          verticalAlign="bottom"
          height={28}
          formatter={(value) => <span className="text-xs font-medium text-slate-600">{value}</span>}
        />
        <Pie
          data={[
            { name: 'Responded', value: respondedPct },
            { name: 'No response', value: clamp(100 - respondedPct, 0, 100) },
          ]}
          dataKey="value"
          nameKey="name"
          outerRadius={92}
          innerRadius={50}
          paddingAngle={2}
          stroke="#ffffff"
          strokeWidth={2}
          label={renderPieLabel}
          labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
        >
          <Cell fill={RESPONSE_RATE_PIE_COLORS.responded} />
          <Cell fill={RESPONSE_RATE_PIE_COLORS.empty} />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

function QuestionChartBody({ question, participantsJoined, chartView }) {
  if (!question) return null

  const chartType = question.chartRawType || question.rawType

  if (chartType === 'word_cloud') {
    return (
      <WordCloudChart words={question.wordCloud} className="h-full" emptyLabel="No words submitted yet" />
    )
  }

  if (chartType === 'open_text') {
    return <OpenTextResponsesList responses={question.openTextResponses} />
  }

  if (chartType === 'ranking') {
    const rankings = question.rankingAnalytics?.rankings
    if (!rankings?.length) {
      return (
        <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
          No ranking submissions yet for this question.
        </div>
      )
    }
    return <RankingLiveChartPanel rankings={rankings} chartView={chartView} />
  }

  if (chartType === 'rating' && question.chart.length > 0) {
    return <RatingAnalyticsBarChart question={question} />
  }

  if (questionUsesEmojiChart(chartType) && question.chart.length > 0) {
    return (
      <EmojiBarChart
        rows={question.chart.map((row) => ({
          emoji: row.emoji || row.name,
          count: row.count,
          percent: row.value,
          optionId: row.name,
        }))}
        total={question.responseCount}
        size="md"
        className="h-full"
      />
    )
  }

  const hasOptionChart = question.chart.length > 0 && questionUsesOptionChart(chartType)

  if (hasOptionChart) {
    return <McqAnalyticsBarChart question={question} />
  }

  return <ResponseRatePieChart question={question} participantsJoined={participantsJoined} />
}

export function AnalyticsQuestionChartSection({
  question,
  participantsJoined,
  chartView,
  onChartViewChange,
}) {
  const chartType = question?.chartRawType || question?.rawType
  const showRankingBreakdown =
    chartType === 'ranking' &&
    Array.isArray(question.rankingAnalytics?.rankings) &&
    question.rankingAnalytics.rankings.length > 0

  const rankingTotalResponses = question?.rankingAnalytics?.totalResponses ?? 0
  const showRatingAvg = chartType === 'rating' && question?.averageRating != null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {showRatingAvg ? (
            <p className="text-sm font-semibold text-navy-900">
              Average rating: <span className="text-lg">{question.averageRating}</span>
              <span className="ml-1 text-xs font-normal text-slate-500">
                (scale {question.ratingMin}–{question.ratingMax})
              </span>
            </p>
          ) : null}
          {showRankingBreakdown ? (
            <p className="text-xs text-slate-500">
              {rankingTotalResponses} ranked submission{rankingTotalResponses === 1 ? '' : 's'} · chart
              uses average score per option
            </p>
          ) : chartType === 'ranking' ? (
            <p className="text-xs text-slate-500">Waiting for ranking submissions…</p>
          ) : null}
        </div>
        {showRankingBreakdown ? (
          <LiveChartViewToggle
            view={chartView}
            onChange={onChartViewChange}
            modes={['table', 'bar', 'pie']}
          />
        ) : null}
      </div>

      <div className="h-72 rounded-2xl border border-blue-200/70 bg-white p-3">
        <QuestionChartBody
          question={question}
          participantsJoined={participantsJoined}
          chartView={chartView}
        />
      </div>
    </div>
  )
}
