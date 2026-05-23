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
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { getQuestionResultsApi } from '../../services/liveApi'
import WordCloudChart from '../../components/charts/WordCloudChart'
import { CHART_TOOLTIP_STYLE } from '../../utils/chartColors'
import { formatQuizSubmitTime } from '../../utils/quizResponseTime'
import {
  buildOptionChartData,
  buildRatingChartData,
  buildResponseRows,
  buildWordCloudData,
  enrichOptionChartDataWithReveal,
  filterResponsesForQuestion,
  questionUsesOptionChart,
} from '../../utils/livePresentation'
import { getCorrectOptionsForQuestion } from '../../utils/livePresentation'
import {
  getPresentBarFill,
  PresentAnswerRevealBadge,
  PresentCorrectOptionStrip,
  shouldShowAnswerRevealUi,
} from './PresentAnswerReveal'
import { PresentSlideHeader } from './PresentShell'

/** Recharts needs a parent with explicit pixel height — not unbounded flex-only sizing. */
function PresentBarChart({ data, rawType, answerRevealed }) {
  const total = data.reduce((s, r) => s + r.value, 0)
  return (
    <div className="h-[clamp(280px,45vh,480px)] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 24 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 18, fill: answerRevealed ? '#64748b' : '#475569', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 16, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(27, 75, 107, 0.06)' }}
          contentStyle={{ ...CHART_TOOLTIP_STYLE, fontSize: 16 }}
          formatter={(value, name, props) => {
            const pct = total ? Math.round((Number(value) / total) * 100) : 0
            const label = props?.payload?.isCorrect ? `${name} ✓` : name
            return [`${value} (${pct}%)`, label]
          }}
        />
        <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={120}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={getPresentBarFill(entry, rawType, answerRevealed)}
              stroke={entry.isCorrect ? '#047857' : undefined}
              strokeWidth={entry.isCorrect ? 2 : 0}
            />
          ))}
        </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TextResponsesList({ rows }) {
  if (!rows.length) {
    return (
      <p className="flex h-full items-center justify-center text-center text-[clamp(1.1rem,2.5vw,1.75rem)] text-slate-500">
        Waiting for responses…
      </p>
    )
  }
  return (
    <div className="grid h-full auto-rows-fr gap-3 overflow-y-auto pr-2">
      {rows.slice(0, 12).map((row) => (
        <div
          key={row.id}
          className="rounded-2xl border border-blue-200/70 bg-white/95 px-6 py-4 shadow-sm"
        >
          <p className="text-[clamp(1.25rem,3vw,2rem)] font-medium leading-snug text-navy-900">
            {row.response}
          </p>
        </div>
      ))}
    </div>
  )
}

export function QuestionSlide({
  accessToken,
  sessionTitle,
  question,
  questionNumber,
  allResponses,
  slideIndex,
  slideTotal,
  detailIndex,
  onDetailIndexChange,
}) {
  const currentResponses = filterResponsesForQuestion(allResponses, question.id)

  const questionResultsQuery = useQuery({
    queryKey: ['live-question-results', question.id],
    queryFn: () => getQuestionResultsApi(accessToken, question.id),
    enabled: Boolean(accessToken && question.id),
    refetchInterval: question.isLive ? 4000 : false,
  })

  const optionDataRaw = buildOptionChartData(
    question,
    questionResultsQuery.data,
    currentResponses,
  )
  const optionData = enrichOptionChartDataWithReveal(optionDataRaw, question)
  const ratingData = buildRatingChartData(currentResponses)
  const showRevealUi = shouldShowAnswerRevealUi(question)
  const wordCloudWords = buildWordCloudData(question, questionResultsQuery.data, currentResponses)
  const responseRows = buildResponseRows(currentResponses)

  const usesOptionChart = questionUsesOptionChart(question.rawType)
  const showWordCloud = question.rawType === 'word_cloud'
  const showRating = question.rawType === 'rating'
  const showTextList = question.rawType === 'open_text' || question.rawType === 'ranking'

  const chartData = showRating ? ratingData : optionData
  const hasChart = (usesOptionChart || showRating) && chartData.length > 0
  const hasChartResponses = chartData.some((d) => d.value > 0)
  const hasResponses = responseRows.length > 0

  const showDetail = detailIndex >= 0 && hasResponses
  const activeResponse = showDetail ? responseRows[detailIndex] : null
  const correctLabels = useMemo(
    () =>
      new Set(
        getCorrectOptionsForQuestion(question).map((o) =>
          String(o.option_text).trim().toLowerCase(),
        ),
      ),
    [question],
  )
  const activeResponseIsCorrect =
    showRevealUi &&
    activeResponse &&
    correctLabels.has(String(activeResponse.response).trim().toLowerCase())

  const goPrevDetail = () => {
    if (!hasResponses) return
    onDetailIndexChange(detailIndex <= 0 ? -1 : detailIndex - 1)
  }

  const goNextDetail = () => {
    if (!hasResponses) return
    if (detailIndex < 0) onDetailIndexChange(0)
    else if (detailIndex < responseRows.length - 1) onDetailIndexChange(detailIndex + 1)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        label={`Question ${questionNumber}`}
        index={slideIndex}
        total={slideTotal}
      />

      <div className="mb-[clamp(0.75rem,2vh,1.25rem)] shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-navy-900 px-4 py-1.5 text-[clamp(0.75rem,1.4vw,0.9rem)] font-semibold text-white">
            {question.type}
          </span>
          {question.isLive ? (
            <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-[clamp(0.75rem,1.4vw,0.9rem)] font-semibold text-emerald-800">
              Live
            </span>
          ) : null}
          {showRevealUi ? <PresentAnswerRevealBadge /> : null}
          <span className="text-[clamp(0.9rem,1.6vw,1.1rem)] font-semibold text-slate-500">
            {currentResponses.length} response{currentResponses.length === 1 ? '' : 's'}
          </span>
        </div>
        <h2 className="mt-[clamp(0.75rem,2vh,1.25rem)] text-[clamp(1.75rem,5vw,3.5rem)] font-bold leading-tight text-navy-900">
          {question.text || 'Untitled question'}
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {showDetail && activeResponse ? (
          <div
            className={`flex min-h-0 flex-1 flex-col items-center justify-center rounded-3xl border bg-white/90 p-[clamp(1.5rem,4vw,3rem)] shadow-xl ${
              showRevealUi
                ? activeResponseIsCorrect
                  ? 'border-emerald-300/80 shadow-emerald-900/10 ring-2 ring-emerald-100'
                  : 'border-slate-200/80 shadow-navy-900/10'
                : 'border-blue-200/70 shadow-navy-900/10'
            }`}
          >
            <p className="text-[clamp(0.85rem,1.5vw,1rem)] font-semibold uppercase tracking-wider text-slate-500">
              Response {detailIndex + 1} of {responseRows.length}
            </p>
            {showRevealUi ? (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[clamp(0.85rem,1.4vw,1rem)] font-bold ${
                  activeResponseIsCorrect
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {activeResponseIsCorrect ? (
                  <>
                    <CheckCircle2 className="size-5" aria-hidden />
                    Got it right
                  </>
                ) : (
                  <>
                    <XCircle className="size-5" aria-hidden />
                    Different choice
                  </>
                )}
              </div>
            ) : null}
            <p className="mt-4 text-[clamp(1.25rem,3vw,2rem)] font-semibold text-navy-600">
              {activeResponse.participant}
            </p>
            <p
              className={`mt-6 max-w-4xl text-center text-[clamp(2rem,6vw,4.5rem)] font-bold leading-tight ${
                showRevealUi
                  ? activeResponseIsCorrect
                    ? 'text-emerald-900'
                    : 'text-navy-900'
                  : 'text-navy-900'
              }`}
            >
              {activeResponse.response}
            </p>
            {activeResponse.responseTimeMs != null ? (
              <p className="mt-8 text-[clamp(1rem,2vw,1.35rem)] text-slate-500">
                {formatQuizSubmitTime(activeResponse.responseTimeMs)}
              </p>
            ) : null}
          </div>
        ) : showWordCloud ? (
          <div className="min-h-0 flex-1 rounded-3xl border border-blue-200/70 bg-white/90 p-6 shadow-xl shadow-navy-900/10">
            <WordCloudChart
              words={wordCloudWords}
              className="h-full min-h-[40vh]"
              emptyLabel="Waiting for words…"
            />
          </div>
        ) : showTextList ? (
          <div className="min-h-0 flex-1 rounded-3xl border border-blue-200/70 bg-white/90 p-6 shadow-xl shadow-navy-900/10">
            <TextResponsesList rows={responseRows} />
          </div>
        ) : hasChart ? (
          <div
            className={`flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-3xl border bg-white/90 p-4 shadow-xl transition-colors ${
              showRevealUi
                ? 'border-emerald-300/80 shadow-emerald-900/10 ring-1 ring-emerald-100'
                : 'border-blue-200/70 shadow-navy-900/10'
            }`}
          >
            <PresentBarChart
              data={usesOptionChart ? optionData : chartData}
              rawType={question.rawType}
              answerRevealed={showRevealUi}
            />
            {showRevealUi ? <PresentCorrectOptionStrip question={question} /> : null}
            {!hasChartResponses ? (
              <p className="mt-3 text-center text-[clamp(0.95rem,1.8vw,1.15rem)] text-slate-500">
                Waiting for participants to answer…
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-white/60">
            <p className="text-[clamp(1.25rem,3vw,2rem)] font-semibold text-slate-500">
              Waiting for participants to answer…
            </p>
          </div>
        )}
      </div>

      {hasResponses ? (
        <div className="mt-[clamp(0.75rem,2vh,1.25rem)] flex shrink-0 flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={goPrevDetail}
            className="rounded-xl border border-blue-200/80 bg-white/90 px-5 py-3 text-[clamp(0.9rem,1.6vw,1.05rem)] font-semibold text-navy-800 shadow-sm transition hover:bg-white disabled:opacity-40"
            disabled={detailIndex < 0}
          >
            ← {detailIndex < 0 ? 'Chart' : 'Previous'}
          </button>
          <button
            type="button"
            onClick={() => onDetailIndexChange(-1)}
            className={`rounded-xl px-5 py-3 text-[clamp(0.9rem,1.6vw,1.05rem)] font-semibold transition ${
              detailIndex < 0
                ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow-md'
                : 'border border-blue-200/80 bg-white/90 text-navy-800 hover:bg-white'
            }`}
          >
            Results chart
          </button>
          <button
            type="button"
            onClick={goNextDetail}
            className="rounded-xl border border-blue-200/80 bg-white/90 px-5 py-3 text-[clamp(0.9rem,1.6vw,1.05rem)] font-semibold text-navy-800 shadow-sm transition hover:bg-white disabled:opacity-40"
            disabled={detailIndex >= responseRows.length - 1}
          >
            {detailIndex < 0 ? 'Responses' : 'Next'} →
          </button>
        </div>
      ) : null}
    </div>
  )
}
