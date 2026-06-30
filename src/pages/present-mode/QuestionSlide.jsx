import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Search, Trophy } from 'lucide-react'
import { getQuestionResultsApi } from '../../services/liveApi'
import WordCloudChart from '../../components/charts/WordCloudChart'
import { buildQuestionLeaderboardForQuestion } from '../../utils/leaderboard'
import { PresentBarChart } from './PresentBarChart'
import {
  buildOptionChartData,
  buildRatingChartData,
  buildResponseRows,
  buildWordCloudData,
  enrichOptionChartDataWithReveal,
  enrichRatingChartDataWithColors,
  filterResponsesForQuestion,
  getCorrectOptionsForQuestion,
  getQuestionChartRawType,
  questionUsesOptionChart,
} from '../../utils/livePresentation'
import {
  PresentAnswerRevealBadge,
  PresentOptionsKey,
  shouldShowAnswerRevealUi,
} from './PresentAnswerReveal'
import { PresentLeaderboardList } from './PresentLeaderboardList'
import { PresentQuestionMedia } from './PresentQuestionMedia'
import { PresentResponsesList } from './PresentResponsesList'
import { PresentSlideHeader } from './PresentShell'
import { PresentViewSwitcher } from './PresentViewSwitcher'

function PresentResponsesPanel({
  responseRows,
  showRevealUi,
  correctLabels,
}) {
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return responseRows
    return responseRows.filter(
      (row) =>
        row.participant.toLowerCase().includes(query) ||
        String(row.response).toLowerCase().includes(query),
    )
  }, [responseRows, search])

  const emptyLabel = search.trim()
    ? `No responses match "${search.trim()}".`
    : 'Waiting for responses…'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-200/70 bg-white/90 shadow-xl shadow-navy-900/10">
      <div className="shrink-0 border-b border-blue-100/80 px-[clamp(0.85rem,2vw,1.25rem)] py-[clamp(0.65rem,1.5vh,0.85rem)]">
        <p className="text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-slate-500">
          Responses
        </p>
        <p className="text-[clamp(0.9rem,1.6vw,1rem)] font-semibold text-navy-800">
          {responseRows.length} submission{responseRows.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-[clamp(0.65rem,1.5vw,1rem)]">
        {responseRows.length > 0 ? (
          <div className="relative mb-3 shrink-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search responses..."
              className="h-9 w-full rounded-xl border border-blue-200/70 bg-white pl-9 pr-3 text-[clamp(0.8rem,1.4vw,0.9rem)] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="Search responses"
            />
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PresentResponsesList
            rows={filteredRows}
            showRevealUi={showRevealUi}
            correctLabels={correctLabels}
            emptyLabel={emptyLabel}
            constrained
          />
        </div>
      </div>
    </div>
  )
}

export function QuestionSlide({
  accessToken,
  sessionTitle,
  question,
  questionNumber,
  allResponses,
  participantCount,
  qaCount,
  isSessionLive,
  onParticipantsClick,
  onQaClick,
}) {
  const [viewMode, setViewMode] = useState('overview')

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
  const ratingData = enrichRatingChartDataWithColors(buildRatingChartData(currentResponses, question))
  const showRevealUi = shouldShowAnswerRevealUi(question)
  const wordCloudWords = buildWordCloudData(question, questionResultsQuery.data, currentResponses)
  const responseRows = buildResponseRows(currentResponses, question)
  const questionLeaderboard = useMemo(
    () => buildQuestionLeaderboardForQuestion(allResponses, question.id, 30),
    [allResponses, question.id],
  )

  const chartRawType = question.chartRawType ?? getQuestionChartRawType(question)
  const usesOptionChart = questionUsesOptionChart(chartRawType)
  const showWordCloud = chartRawType === 'word_cloud'
  const showRating = chartRawType === 'rating'
  const rankingAnalytics = questionResultsQuery.data?.ranking_analytics || null
  const showRanking =
    chartRawType === 'ranking' &&
    Array.isArray(rankingAnalytics?.rankings) &&
    rankingAnalytics.rankings.length > 0
  const showTextList = chartRawType === 'open_text'
  const showQuestionLeaderboard = Boolean(question.isQuizMode && question.showLeaderboard)

  const chartData = showRating ? ratingData : optionData
  const hasChart = (usesOptionChart || showRating) && chartData.length > 0
  const hasChartResponses = chartData.some((d) => d.value > 0)

  const correctLabels = useMemo(
    () =>
      new Set(
        getCorrectOptionsForQuestion(question).map((o) =>
          String(o.option_text).trim().toLowerCase(),
        ),
      ),
    [question],
  )

  const showSplitLayout = !showTextList
  const leaderboardViews = useMemo(
    () =>
      showQuestionLeaderboard
        ? [
            { id: 'overview', label: 'Results & responses', icon: BarChart3 },
            { id: 'leaderboard', label: 'Rankings', icon: Trophy },
          ]
        : [],
    [showQuestionLeaderboard],
  )

  useEffect(() => {
    setViewMode('overview')
  }, [question.id])

  useEffect(() => {
    if (viewMode === 'leaderboard' && !showQuestionLeaderboard) {
      setViewMode('overview')
    }
  }, [viewMode, showQuestionLeaderboard])

  const renderResultsPanel = ({ compact = false } = {}) => {
    const panelClass = compact
      ? 'flex min-h-0 flex-1 flex-col rounded-3xl border border-blue-200/70 bg-white/90 p-[clamp(0.65rem,1.5vw,1rem)] shadow-xl shadow-navy-900/10'
      : 'min-h-0 flex-1 rounded-3xl border border-blue-200/70 bg-white/90 p-6 shadow-xl shadow-navy-900/10'

    if (showWordCloud) {
      return (
        <div className={panelClass}>
          <p className="mb-2 shrink-0 text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-slate-500">
            Word cloud
          </p>
          <WordCloudChart
            words={wordCloudWords}
            className={compact ? 'min-h-0 flex-1' : 'h-full min-h-[40vh]'}
            emptyLabel="Waiting for words…"
          />
        </div>
      )
    }

    if (showRanking) {
      return (
        <div className={`${panelClass} overflow-auto`}>
          <p className="mb-2 shrink-0 text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-slate-500">
            Ranking results
          </p>
          <table className="w-full text-left text-[clamp(0.8rem,1.3vw,0.95rem)]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-blue-100">
                <th className="px-2 py-1.5 font-semibold text-slate-700">Rank</th>
                <th className="px-2 py-1.5 font-semibold text-slate-700">Option</th>
                <th className="px-2 py-1.5 font-semibold text-slate-700">Score</th>
                <th className="px-2 py-1.5 font-semibold text-slate-700">Avg</th>
              </tr>
            </thead>
            <tbody>
              {rankingAnalytics.rankings.map((row) => (
                <tr key={row.optionId} className="border-b border-blue-50 last:border-b-0">
                  <td className="px-2 py-1.5 font-semibold text-navy-900">{row.rank}</td>
                  <td className="px-2 py-1.5 text-slate-700">{row.optionText}</td>
                  <td className="px-2 py-1.5 text-slate-700">{row.totalScore}</td>
                  <td className="px-2 py-1.5 text-slate-700">{row.averageScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (hasChart) {
      return (
        <div className={panelClass}>
          <p className="mb-2 shrink-0 text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-slate-500">
            Results
          </p>
          <PresentBarChart
            data={usesOptionChart ? optionData : chartData}
            rawType={chartRawType}
            answerRevealed={showRevealUi}
            compact={compact}
          />
          {showRevealUi ? <PresentOptionsKey question={question} chartData={optionData} /> : null}
          {!hasChartResponses ? (
            <p className="mt-2 shrink-0 text-center text-[clamp(0.85rem,1.5vw,1rem)] text-slate-500">
              Waiting for participants to answer…
            </p>
          ) : null}
        </div>
      )
    }

    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-white/60">
        <p className="text-[clamp(1rem,2.2vw,1.5rem)] font-semibold text-slate-500">
          Waiting for participants to answer…
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        participantCount={participantCount}
        qaCount={qaCount}
        isSessionLive={isSessionLive}
        onParticipantsClick={onParticipantsClick}
        onQaClick={onQaClick}
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
          {/* {showRevealUi ? <PresentAnswerRevealBadge /> : null} */}
          {showQuestionLeaderboard ? (
            <span className="rounded-full bg-amber-100 px-4 py-1.5 text-[clamp(0.75rem,1.4vw,0.9rem)] font-semibold text-amber-900">
              Rankings on
            </span>
          ) : null}
          <span className="text-[clamp(0.9rem,1.6vw,1.1rem)] font-semibold text-slate-500">
            {currentResponses.length} response{currentResponses.length === 1 ? '' : 's'}
          </span>
        </div>
        <div
          className={`mt-[clamp(0.75rem,2vh,1.25rem)] ${
            question.media?.url
              ? 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'
              : ''
          }`}
        >
          <h2 className="min-w-0 flex-1 text-[clamp(1.75rem,5vw,3.5rem)] font-bold leading-tight text-navy-900">
            {question.text || 'Untitled question'}
          </h2>
          {question.media?.url ? (
            <PresentQuestionMedia
              media={question.media}
              className="w-full lg:w-[min(30vw,340px)]"
            />
          ) : null}
        </div>
      </div>

      {leaderboardViews.length > 1 ? (
        <div className="mb-[clamp(0.75rem,2vh,1rem)] flex shrink-0 justify-center">
          <PresentViewSwitcher views={leaderboardViews} activeId={viewMode} onChange={setViewMode} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {viewMode === 'leaderboard' ? (
          <PresentLeaderboardList
            entries={questionLeaderboard}
            title="Question rankings"
            emptyMessage="Rankings will appear as participants answer this question."
          />
        ) : showSplitLayout ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-1">
            <div className="flex min-h-0 min-w-0 flex-col lg:max-h-[min(52vh,520px)]">
              {renderResultsPanel({ compact: true })}
            </div>
            <div className="flex min-h-0 min-w-0 flex-col lg:max-h-[min(52vh,520px)]">
              <PresentResponsesPanel
                key={question.id}
                responseRows={responseRows}
                showRevealUi={showRevealUi}
                correctLabels={correctLabels}
              />
            </div>
          </div>
        ) : showTextList ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:max-h-[min(52vh,560px)]">
            <PresentResponsesPanel
              key={question.id}
              responseRows={responseRows}
              showRevealUi={showRevealUi}
              correctLabels={correctLabels}
            />
          </div>
        ) : (
          renderResultsPanel()
        )}
      </div>
    </div>
  )
}
