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
import { PresentQuestionMedia } from '../present-mode/PresentQuestionMedia'

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
      <header className="preview-deck-question relative z-20 shrink-0 px-[clamp(0.5rem,2vw,1rem)] pt-[clamp(0.25rem,1vh,0.75rem)]">
        <div
          className={
            question.media?.url
              ? 'flex flex-col items-center gap-[clamp(0.75rem,2vh,1.25rem)] lg:flex-row lg:items-start lg:justify-center lg:gap-[clamp(1.25rem,3vw,2.5rem)]'
              : 'text-center'
          }
        >
          <h2
            className={`min-w-0 font-bold leading-[1.12] tracking-tight text-navy-900 ${
              question.media?.url
                ? 'flex-1 text-center text-[clamp(1.75rem,5.5vw,3.75rem)] lg:text-left'
                : 'mx-auto max-w-[22ch] text-[clamp(2rem,6.5vw,4.25rem)] sm:max-w-[28ch]'
            }`}
          >
            {question.text || 'Untitled question'}
          </h2>
          {question.media?.url ? (
            <PresentQuestionMedia
              media={question.media}
              className="relative z-20 w-full max-w-md lg:w-[min(28vw,320px)] lg:max-w-none lg:shrink-0"
            />
          ) : null}
        </div>
      </header>

      <div className="relative z-0 mt-[clamp(0.75rem,2.5vh,1.75rem)] flex min-h-0 flex-1 flex-col">
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
