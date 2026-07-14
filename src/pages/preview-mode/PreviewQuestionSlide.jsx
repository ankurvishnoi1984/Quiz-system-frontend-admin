import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getQuestionResultsApi } from '../../services/liveApi'
import { EmojiBarChart } from '../../components/emoji/EmojiBarChart'
import { buildEmojiBarData } from '../../utils/emojiReaction'
import {
  buildOptionChartData,
  buildRatingChartData,
  buildResponseRows,
  buildWordCloudData,
  enrichOptionChartDataWithReveal,
  enrichRatingChartDataWithColors,
  filterResponsesForQuestion,
  getQuestionChartRawType,
  questionUsesEmojiChart,
  questionUsesOptionChart,
} from '../../utils/livePresentation'
import { PreviewBarChart } from './PreviewBarChart'
import {
  PreviewAnswerStream,
  PreviewRankingBars,
  PreviewWordCloud,
} from './PreviewPresentationVisuals'

/**
 * PPT / Mentimeter-style slide: question + full-screen answers only.
 * No response tables, participant lists, or dashboard chrome.
 */
export function PreviewQuestionSlide({
  accessToken,
  question,
  allResponses,
}) {
  const currentResponses = filterResponsesForQuestion(allResponses, question.id)

  const questionResultsQuery = useQuery({
    queryKey: ['live-question-results', question.id, 'preview'],
    queryFn: () => getQuestionResultsApi(accessToken, question.id),
    enabled: Boolean(accessToken && question.id),
    refetchInterval: question.isLive ? 3000 : false,
  })

  const optionDataRaw = buildOptionChartData(
    question,
    questionResultsQuery.data,
    currentResponses,
  )
  const optionData = enrichOptionChartDataWithReveal(optionDataRaw, question)
  const ratingData = enrichRatingChartDataWithColors(
    buildRatingChartData(currentResponses, question),
  )
  const wordCloudWords = buildWordCloudData(question, questionResultsQuery.data, currentResponses)
  const responseRows = buildResponseRows(currentResponses, question)

  const chartRawType = question.chartRawType ?? getQuestionChartRawType(question)
  const usesOptionChart = questionUsesOptionChart(chartRawType)
  const showWordCloud = chartRawType === 'word_cloud'
  const showEmojiReaction = questionUsesEmojiChart(chartRawType)
  const emojiBarData = useMemo(
    () =>
      showEmojiReaction
        ? buildEmojiBarData(question, questionResultsQuery.data, currentResponses)
        : { rows: [], total: 0 },
    [showEmojiReaction, question, questionResultsQuery.data, currentResponses],
  )
  const showRating = chartRawType === 'rating'
  const rankingAnalytics = questionResultsQuery.data?.ranking_analytics || null
  const showRanking =
    chartRawType === 'ranking' &&
    Array.isArray(rankingAnalytics?.rankings) &&
    rankingAnalytics.rankings.length > 0
  const showTextList = chartRawType === 'open_text'
  const chartData = showRating ? ratingData : optionData
  const hasChart = (usesOptionChart || showRating) && chartData.length > 0
  const hasChartResponses = chartData.some((d) => d.value > 0)

  const renderVisual = () => {
    if (showEmojiReaction) {
      if (!emojiBarData.rows.length) {
        return <WaitingLabel />
      }
      return (
        <EmojiBarChart
          rows={emojiBarData.rows}
          total={emojiBarData.total}
          size="lg"
          className="min-h-0 flex-1"
        />
      )
    }

    if (showWordCloud) {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <PreviewWordCloud words={wordCloudWords} />
        </div>
      )
    }

    if (showRanking) {
      return <PreviewRankingBars rankings={rankingAnalytics.rankings} />
    }

    if (showTextList) {
      return <PreviewAnswerStream answers={responseRows} />
    }

    if (hasChart) {
      if (!hasChartResponses) {
        return (
          <div className="relative flex h-full min-h-0 flex-1 flex-col">
            <PreviewBarChart
              data={usesOptionChart ? optionData : chartData}
              rawType={chartRawType}
            />
            <WaitingLabel overlay />
          </div>
        )
      }
      return (
        <PreviewBarChart
          data={usesOptionChart ? optionData : chartData}
          rawType={chartRawType}
        />
      )
    }

    return <WaitingLabel />
  }

  return (
    <div className="preview-deck flex min-h-0 flex-1 flex-col">
      <header className="preview-deck-question shrink-0 px-[clamp(0.5rem,2vw,1rem)] pt-[clamp(0.25rem,1vh,0.75rem)] text-center">
        <h2 className="mx-auto max-w-[22ch] text-[clamp(2rem,6.5vw,4.25rem)] font-bold leading-[1.12] tracking-tight text-navy-900 sm:max-w-[28ch]">
          {question.text || 'Untitled question'}
        </h2>
      </header>

      <div className="relative mt-[clamp(0.75rem,2.5vh,1.75rem)] flex min-h-0 flex-1 flex-col">
        {renderVisual()}
      </div>
    </div>
  )
}

function WaitingLabel({ overlay = false }) {
  const label = (
    <p className="text-center text-[clamp(1.15rem,2.5vw,1.75rem)] font-semibold text-slate-500">
      Waiting for answers…
    </p>
  )
  if (overlay) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {label}
      </div>
    )
  }
  return <div className="flex h-full items-center justify-center">{label}</div>
}
