import { BarChart3, CheckCircle2 } from 'lucide-react'
import { QuestionSurveyResults } from './question/QuestionSurveyResults'
import { mapParticipantQuestion } from '../utils/questionUtils'

function SummarySkeleton({ count = 2 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-2xl border border-sky-200/70 bg-sky-50/60"
        />
      ))}
    </div>
  )
}

export function SurveySessionEndingPanel({
  sessionTitle = '',
  summary,
  isLoading = false,
  error = '',
  variant = 'participant',
  showThankYou = true,
}) {
  const isPresent = variant === 'present'
  const questions = summary?.questions || []
  const totalQuestions = summary?.total_questions ?? questions.length
  const totalResponses = summary?.total_responses ?? 0

  const containerClass = isPresent
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
    : 'space-y-4'

  const scrollClass = isPresent
    ? 'present-lb-list min-h-0 flex-1 space-y-[clamp(1rem,2.5vh,1.5rem)] overflow-y-auto pr-1'
    : 'space-y-4'

  return (
    <section className={containerClass}>
      {showThankYou ? (
        <div
          className={`rounded-2xl border border-emerald-200/80 bg-linear-to-r from-emerald-50/90 to-white shadow-sm ${
            isPresent
              ? 'mb-[clamp(0.75rem,2vh,1.25rem)] shrink-0 px-[clamp(1rem,3vw,2rem)] py-[clamp(1rem,2.5vh,1.5rem)]'
              : 'p-5'
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`grid shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 ${
                isPresent ? 'size-[clamp(2.5rem,5vw,3.25rem)]' : 'size-11'
              }`}
            >
              <CheckCircle2 className={isPresent ? 'size-[clamp(1.2rem,2.5vw,1.6rem)]' : 'size-5'} />
            </span>
            <div className="min-w-0">
              <p
                className={`font-semibold uppercase tracking-[0.2em] text-emerald-700 ${
                  isPresent ? 'text-[clamp(0.7rem,1.3vw,0.8rem)]' : 'text-xs'
                }`}
              >
                Session complete
              </p>
              <h2
                className={`font-bold text-navy-900 ${
                  isPresent
                    ? 'mt-2 text-[clamp(1.5rem,4vw,2.5rem)] leading-tight'
                    : 'mt-1 text-xl'
                }`}
              >
                Thank you for participating
              </h2>
              {sessionTitle ? (
                <p
                  className={`mt-2 text-slate-600 ${
                    isPresent ? 'text-[clamp(0.95rem,1.8vw,1.15rem)]' : 'text-sm'
                  }`}
                >
                  {sessionTitle}
                </p>
              ) : null}
              <p
                className={`mt-2 inline-flex items-center gap-2 font-medium text-slate-600 ${
                  isPresent ? 'text-[clamp(0.85rem,1.6vw,1rem)]' : 'text-sm'
                }`}
              >
                <BarChart3 className="size-4 shrink-0 text-sky-700" aria-hidden />
                {totalQuestions} question{totalQuestions === 1 ? '' : 's'} · {totalResponses} total
                response{totalResponses === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <SummarySkeleton />
      ) : !questions.length ? (
        <p
          className={`rounded-2xl border border-sky-200/70 bg-sky-50/50 px-4 py-6 text-center text-slate-600 ${
            isPresent ? 'text-[clamp(0.95rem,1.8vw,1.1rem)]' : 'text-sm'
          }`}
        >
          Results will appear here as participants submit responses.
        </p>
      ) : (
        <div className={scrollClass}>
          {questions.map((row, index) => {
            const mappedQuestion = mapParticipantQuestion(row.question)
            return (
              <div key={row.question?.question_id ?? index} className="space-y-2">
                <p
                  className={`font-semibold text-navy-800 ${
                    isPresent ? 'text-[clamp(0.95rem,1.8vw,1.15rem)]' : 'text-sm'
                  }`}
                >
                  Q{index + 1}. {row.question?.question_text}
                </p>
                <QuestionSurveyResults question={mappedQuestion} results={row.results} isLoading={false} />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
