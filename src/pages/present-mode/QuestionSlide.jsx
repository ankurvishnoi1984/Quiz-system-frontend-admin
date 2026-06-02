import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, List, Trophy } from 'lucide-react'
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
  questionUsesOptionChart,
} from '../../utils/livePresentation'
import {
  PresentAnswerRevealBadge,
  PresentOptionsKey,
  shouldShowAnswerRevealUi,
} from './PresentAnswerReveal'
import { PresentLeaderboardList } from './PresentLeaderboardList'
import { PresentResponsesList } from './PresentResponsesList'
import { PresentSlideHeader } from './PresentShell'
import { PresentViewSwitcher } from './PresentViewSwitcher'

function TextResponsesPanel({ rows }) {
  if (!rows.length) {
    return (
      <p className="flex h-full items-center justify-center text-center text-[clamp(1.1rem,2.5vw,1.75rem)] text-slate-500">
        Waiting for responses…
      </p>
    )
  }
  return (
    <ul className="present-lb-list grid h-full auto-rows-min gap-3 overflow-y-auto pr-2">
      {rows.slice(0, 24).map((row, idx) => (
        <li
          key={row.id}
          className="present-lb-row rounded-2xl border border-blue-200/70 bg-white/95 px-6 py-4 shadow-sm"
          style={{ animationDelay: `${idx * 40}ms` }}
        >
          <p className="text-[clamp(0.9rem,1.6vw,1rem)] font-semibold text-navy-600">{row.participant}</p>
          <p className="mt-1 text-[clamp(1.25rem,3vw,2rem)] font-medium leading-snug text-navy-900">
            {row.response}
          </p>
        </li>
      ))}
    </ul>
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
}) {
  const [viewMode, setViewMode] = useState('results')

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
  const ratingData = enrichRatingChartDataWithColors(buildRatingChartData(currentResponses))
  const showRevealUi = shouldShowAnswerRevealUi(question)
  const wordCloudWords = buildWordCloudData(question, questionResultsQuery.data, currentResponses)
  const responseRows = buildResponseRows(currentResponses)
  const questionLeaderboard = useMemo(
    () => buildQuestionLeaderboardForQuestion(allResponses, question.id, 30),
    [allResponses, question.id],
  )

  const usesOptionChart = questionUsesOptionChart(question.rawType)
  const showWordCloud = question.rawType === 'word_cloud'
  const showRating = question.rawType === 'rating'
  const rankingAnalytics = questionResultsQuery.data?.ranking_analytics || null
  const showRanking =
    question.rawType === 'ranking' &&
    Array.isArray(rankingAnalytics?.rankings) &&
    rankingAnalytics.rankings.length > 0
  const showTextList = question.rawType === 'open_text'
  const showQuestionLeaderboard = Boolean(question.isQuizMode && question.showLeaderboard)

  const chartData = showRating ? ratingData : optionData
  const hasChart = (usesOptionChart || showRating) && chartData.length > 0
  const hasChartResponses = chartData.some((d) => d.value > 0)
  const hasResponses = responseRows.length > 0

  const correctLabels = useMemo(
    () =>
      new Set(
        getCorrectOptionsForQuestion(question).map((o) =>
          String(o.option_text).trim().toLowerCase(),
        ),
      ),
    [question],
  )

  const views = useMemo(() => {
    const list = [{ id: 'results', label: 'Results', icon: BarChart3 }]
    if (showQuestionLeaderboard) {
      list.push({ id: 'leaderboard', label: 'Leaderboard', icon: Trophy })
    }
    if (hasResponses && !showWordCloud && !showTextList) {
      list.push({ id: 'responses', label: 'All responses', icon: List })
    }
    return list
  }, [showQuestionLeaderboard, hasResponses, showWordCloud, showTextList])

  useEffect(() => {
    setViewMode('results')
  }, [question.id])

  useEffect(() => {
    if (!views.some((v) => v.id === viewMode)) {
      setViewMode(views[0]?.id ?? 'results')
    }
  }, [views, viewMode])

  const renderResults = () => {
    if (showWordCloud) {
      return (
        <div className="min-h-0 flex-1 rounded-3xl border border-blue-200/70 bg-white/90 p-6 shadow-xl shadow-navy-900/10">
          <WordCloudChart
            words={wordCloudWords}
            className="h-full min-h-[40vh]"
            emptyLabel="Waiting for words…"
          />
        </div>
      )
    }
    if (showTextList) {
      return (
        <div className="min-h-0 flex-1 rounded-3xl border border-blue-200/70 bg-white/90 p-6 shadow-xl shadow-navy-900/10">
          <TextResponsesPanel rows={responseRows} />
        </div>
      )
    }
    if (showRanking) {
      return (
        <div className="min-h-0 flex-1 overflow-auto rounded-3xl border border-blue-200/70 bg-white/90 p-6 shadow-xl shadow-navy-900/10">
          <table className="w-full text-left text-[clamp(0.85rem,1.4vw,1rem)]">
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
              {rankingAnalytics.rankings.map((row) => (
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
    if (hasChart) {
      return (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-3xl border border-blue-200/70 bg-white/90 p-4 shadow-xl shadow-navy-900/10">
          <PresentBarChart
            data={usesOptionChart ? optionData : chartData}
            rawType={question.rawType}
            answerRevealed={showRevealUi}
          />
          {showRevealUi ? <PresentOptionsKey question={question} chartData={optionData} /> : null}
          {!hasChartResponses ? (
            <p className="mt-3 text-center text-[clamp(0.95rem,1.8vw,1.15rem)] text-slate-500">
              Waiting for participants to answer…
            </p>
          ) : null}
        </div>
      )
    }
    return (
      <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-white/60">
        <p className="text-[clamp(1.25rem,3vw,2rem)] font-semibold text-slate-500">
          Waiting for participants to answer…
        </p>
      </div>
    )
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
          {showQuestionLeaderboard ? (
            <span className="rounded-full bg-amber-100 px-4 py-1.5 text-[clamp(0.75rem,1.4vw,0.9rem)] font-semibold text-amber-900">
              Leaderboard on
            </span>
          ) : null}
          <span className="text-[clamp(0.9rem,1.6vw,1.1rem)] font-semibold text-slate-500">
            {currentResponses.length} response{currentResponses.length === 1 ? '' : 's'}
          </span>
        </div>
        <h2 className="mt-[clamp(0.75rem,2vh,1.25rem)] text-[clamp(1.75rem,5vw,3.5rem)] font-bold leading-tight text-navy-900">
          {question.text || 'Untitled question'}
        </h2>
      </div>

      {views.length > 1 ? (
        <div className="mb-[clamp(0.75rem,2vh,1rem)] flex shrink-0 justify-center">
          <PresentViewSwitcher views={views} activeId={viewMode} onChange={setViewMode} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {viewMode === 'leaderboard' ? (
          <PresentLeaderboardList
            entries={questionLeaderboard}
            title="Question leaderboard"
            emptyMessage="Rankings will appear as participants answer this question."
          />
        ) : null}

        {viewMode === 'responses' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-200/70 bg-white/90 shadow-xl shadow-navy-900/10">
            <div className="shrink-0 border-b border-blue-100/80 px-[clamp(1rem,3vw,1.75rem)] py-[clamp(0.75rem,2vh,1rem)]">
              <p className="text-[clamp(0.7rem,1.3vw,0.8rem)] font-semibold uppercase tracking-wider text-slate-500">
                All responses
              </p>
              <p className="text-[clamp(0.95rem,1.8vw,1.1rem)] font-semibold text-navy-800">
                {responseRows.length} submission{responseRows.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="min-h-0 flex-1 p-[clamp(0.75rem,2vw,1.25rem)]">
              <PresentResponsesList
                rows={responseRows}
                showRevealUi={showRevealUi}
                correctLabels={correctLabels}
              />
            </div>
          </div>
        ) : null}

        {viewMode === 'results' ? renderResults() : null}
      </div>
    </div>
  )
}
