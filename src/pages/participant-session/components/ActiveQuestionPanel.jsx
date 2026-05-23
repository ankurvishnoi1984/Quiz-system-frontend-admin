import { Pencil } from 'lucide-react'
import { McqOptions } from './question/McqOptions'
import { QuestionLeaderboard } from './question/QuestionLeaderboard'
import { QuestionTimer } from './question/QuestionTimer'
import { RatingOptions } from './question/RatingOptions'
import { TextResponse } from './question/TextResponse'
import { TrueFalseOptions } from './question/TrueFalseOptions'
import { WordCloudInput } from './question/WordCloudInput'

export function ActiveQuestionPanel({
  question,
  activeQuestions,
  displayQuestionIndex,
  hasCountdown,
  canGoToNextQuestion,
  inputsLocked,
  hasAnyQuestionSaved,
  timeLimit,
  timer,
  currentResponse,
  answerRevealMeta,
  isAnswerRevealed,
  hasAttemptedQuestion,
  canSeeAnswerReveal,
  participantAnswerIsCorrect,
  sessionEnded = false,
  tagsInput,
  submitted,
  isLastDisplayedQuestion,
  isSubmitting,
  hasFinalizePayload,
  showCurrentQuestionLeaderboard,
  currentQuestionLeaderboard,
  onTagsInputChange,
  onAddTag,
  onSelectOption,
  onSelectRating,
  onTextChange,
  onPrevious,
  onNextOrSubmit,
  onGoToQa,
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-navy-700">
            Question {displayQuestionIndex + 1} / {activeQuestions.length}
          </p>
        </div>
        {hasCountdown && !canGoToNextQuestion && (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            Answer this question or wait for the timer to use Next.
          </p>
        )}
        {hasCountdown && canGoToNextQuestion && inputsLocked && (
          <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            Timed: use Previous and Next to browse; answers cannot be changed after submit or when
            time runs out.
          </p>
        )}
        {!hasCountdown && hasAnyQuestionSaved && (
          <p className="max-w-[min(100%,18rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
            No timer: revisit questions with Previous; use Submit on the last question to update.
          </p>
        )}
      </div>

      {question.media?.url && question.media.kind === 'image' && (
        <img
          src={question.media.url}
          alt="Question media"
          className="max-h-80 w-full rounded-2xl border border-blue-100 object-contain"
        />
      )}
      {question.media?.url && question.media.kind === 'video' && (
        <video
          src={question.media.url}
          controls
          className="max-h-80 w-full rounded-2xl border border-blue-100"
        />
      )}
      <h2 className="text-2xl font-bold text-navy-900">{question.text || 'Untitled question'}</h2>

      {hasCountdown && <QuestionTimer timer={timer} timeLimit={timeLimit} />}

      {isAnswerRevealed &&
        !hasAttemptedQuestion &&
        (question.type === 'MCQ' || question.type === 'True/False') && (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-slate-600">
            Answer this question first. The correct answer will be shown after you submit or when
            time runs out.
          </p>
        )}

      {question.type === 'MCQ' && (
        <McqOptions
          options={question.options}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          answerRevealMeta={answerRevealMeta}
          canSeeAnswerReveal={canSeeAnswerReveal}
          onSelectOption={(optionText) => onSelectOption(question.id, optionText)}
        />
      )}

      {question.type === 'Rating' && (
        <RatingOptions
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          onSelectRating={(rating) => onSelectRating(question.id, rating)}
        />
      )}

      {(question.type === 'Text' || question.type === 'Ranking') && (
        <TextResponse
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          onTextChange={(text) => onTextChange(question.id, text)}
        />
      )}

      {question.type === 'Word Cloud' && (
        <WordCloudInput
          tagsInput={tagsInput}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          onTagsInputChange={onTagsInputChange}
          onAddTag={() => onAddTag(question.id)}
        />
      )}

      {question.type === 'True/False' && (
        <TrueFalseOptions
          question={question}
          currentResponse={currentResponse}
          inputsLocked={inputsLocked}
          answerRevealMeta={answerRevealMeta}
          canSeeAnswerReveal={canSeeAnswerReveal}
          onSelectOption={(optionText) => onSelectOption(question.id, optionText)}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous question"
          disabled={displayQuestionIndex <= 0}
          onClick={onPrevious}
          className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isLastDisplayedQuestion && submitted && !hasCountdown && (
            <button
              type="button"
              onClick={onGoToQa}
              className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
            >
              Go to Q&A
            </button>
          )}
          <button
            type="button"
            aria-label={isLastDisplayedQuestion ? 'Submit all answers and finish' : 'Next question'}
            disabled={
              sessionEnded ||
              isSubmitting ||
              (isLastDisplayedQuestion
                ? !hasFinalizePayload || (hasCountdown && !canGoToNextQuestion)
                : hasCountdown && !canGoToNextQuestion)
            }
            title={
              sessionEnded
                ? 'Session has ended'
                : hasCountdown && !canGoToNextQuestion
                  ? 'Answer this question or wait for the timer'
                  : isLastDisplayedQuestion && !hasFinalizePayload
                    ? 'Answer the open question(s) before submitting'
                    : undefined
            }
            onClick={onNextOrSubmit}
            className={`h-11 rounded-xl px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isLastDisplayedQuestion
                ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow-lg shadow-blue-900/20 hover:brightness-110'
                : 'border border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            {isSubmitting
              ? isLastDisplayedQuestion
                ? 'Submitting...'
                : 'Saving...'
              : isLastDisplayedQuestion
                ? 'Submit'
                : 'Next'}
          </button>
        </div>
      </div>

      {submitted && !hasCountdown && !sessionEnded && (
        <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-4">
          <Pencil className="mt-0.5 size-5 shrink-0 text-sky-700" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-navy-900">Modify your responses anytime</p>
            <p className="mt-1 text-xs text-slate-600">
              There is no timer on this question. Change your answer above and use Submit when you
              are on the last question to update your submission.
            </p>
          </div>
        </div>
      )}

      {sessionEnded && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Session ended</p>
          <p className="mt-1 text-xs text-slate-600">
            This session has ended. You can review your answers but cannot submit new responses.
          </p>
        </div>
      )}

      {canSeeAnswerReveal &&
        (question.type === 'MCQ' || question.type === 'True/False') &&
        participantAnswerIsCorrect !== null && (
          <div
            className={`rounded-2xl border p-4 ${
              participantAnswerIsCorrect
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                participantAnswerIsCorrect ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              {participantAnswerIsCorrect ? 'Correct Answer' : 'Incorrect Answer'}
            </p>
          </div>
        )}

      {showCurrentQuestionLeaderboard && (
        <QuestionLeaderboard entries={currentQuestionLeaderboard} />
      )}
    </section>
  )
}
