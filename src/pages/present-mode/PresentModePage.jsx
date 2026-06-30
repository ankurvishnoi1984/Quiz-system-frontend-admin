import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Maximize2, Minimize2, Play, Trophy } from 'lucide-react'
import { HostAlertModal } from '../../components/live/HostAlertModal'
import { HostQuestionActionButton } from '../../components/live/HostQuestionActionButton'
import { HostQuestionControls } from '../../components/live/HostQuestionControls'
import { useAuthStore } from '../../store/authStore'
import { useHostQuestionMutations } from '../../hooks/useHostQuestionMutations'
import { useLiveSession } from '../../hooks/useLiveSession'
import { listQaQuestionsApi, updateSessionApi } from '../../services/liveApi'
import { canHostActivateAllQuestions, canHostCloseAllQuestions } from '../../utils/hostQuestionControls'
import { sessionSupportsOverallLeaderboard } from '../../utils/livePresentation'
import { isSessionQuizTotalTimeEnabled } from '../../utils/sessionFlags'
import { LeaderboardSlide } from './LeaderboardSlide'
import { ParticipantsSlide } from './ParticipantsSlide'
import { PresentNavButton, PresentShell } from './PresentShell'
import { PresentParticipantsModal } from './PresentParticipantsModal'
import { PresentQaModal } from './PresentQaModal'
import { QuestionSlide } from './QuestionSlide'

function PresentModePage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  const { session, mappedQuestions, responses, participants, leaderboard, isLoading, isError } =
    useLiveSession(accessToken, sessionId)

  const [slideIndex, setSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hostAlert, setHostAlert] = useState(null)
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false)
  const [qaModalOpen, setQaModalOpen] = useState(false)

  const openParticipantsModal = useCallback(() => setParticipantsModalOpen(true), [])
  const openQaModal = useCallback(() => setQaModalOpen(true), [])

  const qaQuery = useQuery({
    queryKey: ['live-qa', sessionId],
    queryFn: () => listQaQuestionsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    refetchInterval: session?.status === 'live' ? 5000 : false,
  })

  const qaQuestions = qaQuery.data || []
  const qaCount = qaQuestions.length

  const canEditLive = session?.status === 'live'
  const showSessionControls = session?.status === 'live' || session?.status === 'paused'
  const canToggleOverallLeaderboard = sessionSupportsOverallLeaderboard(mappedQuestions)
  const singleActiveQuestionMode = session?.participant_navigation_enabled === false
  const sessionQuizTotalTimeEnabled = isSessionQuizTotalTimeEnabled(session)

  const showActivateAllQuestionsButton = useMemo(
    () =>
      canHostActivateAllQuestions(mappedQuestions, {
        canEditLive,
        singleActiveQuestionMode,
        sessionQuizTotalTimeEnabled,
      }),
    [mappedQuestions, canEditLive, singleActiveQuestionMode, sessionQuizTotalTimeEnabled],
  )

  const showCloseAllQuestionsButton = useMemo(
    () =>
      canHostCloseAllQuestions(mappedQuestions, {
        canEditLive,
        singleActiveQuestionMode,
      }),
    [mappedQuestions, canEditLive, singleActiveQuestionMode],
  )

  const sessionLeaderboardMutation = useMutation({
    mutationFn: (enabled) =>
      updateSessionApi(accessToken, sessionId, { leaderboard_enabled: enabled }),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(['live-session', sessionId], (old) =>
          old
            ? {
                ...old,
                ...updated,
                leaderboard_enabled: updated.leaderboard_enabled,
              }
            : updated,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
    },
    onError: () => {
      setHostAlert({
        variant: 'error',
        title: 'Could not update rankings',
        message: 'Unable to update the overall rankings setting. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const {
    questionLiveMutation,
    questionLeaderboardMutation,
    answerRevealMutation,
    closeQuestionMutation,
    closeAllQuestionsMutation,
    activateAllQuestionsMutation,
    reattemptMutation,
    openForReattempt,
    closeQuestion,
    closeAllQuestions,
    activateAllQuestions,
  } = useHostQuestionMutations(accessToken, sessionId, {
    onCloseQuestionSuccess: (questionText) => {
      const preview = String(questionText || '').trim()
      setHostAlert({
        variant: 'success',
        title: 'Question closed',
        message: preview
          ? `Participants can still see this question but can no longer submit answers:\n\n“${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}”`
          : 'Participants can still see this question but can no longer submit answers.',
        confirmLabel: 'OK',
      })
    },
    onCloseQuestionError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not close question',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
    onCloseAllQuestionsSuccess: (closedCount) => {
      setHostAlert({
        variant: 'success',
        title: 'All questions closed',
        message:
          closedCount > 0
            ? `All ${closedCount} live question${closedCount === 1 ? '' : 's'} ${closedCount === 1 ? 'was' : 'were'} successfully closed.`
            : 'All questions were successfully closed.',
        confirmLabel: 'OK',
      })
    },
    onCloseAllQuestionsError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not close all questions',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
    onActivateAllQuestionsSuccess: (activatedCount) => {
      setHostAlert({
        variant: 'success',
        title: 'All questions activated',
        message:
          activatedCount > 0
            ? `${activatedCount} question${activatedCount === 1 ? '' : 's'} ${activatedCount === 1 ? 'is' : 'are'} now live.`
            : 'All questions are now live.',
        confirmLabel: 'OK',
      })
    },
    onActivateAllQuestionsError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not activate all questions',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
    onReattemptSuccess: (questionText) => {
      const preview = String(questionText || '').trim()
      setHostAlert({
        variant: 'success',
        title: 'Opened for reattempt',
        message: preview
          ? `Participants are being notified and can answer again:\n\n“${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}”`
          : 'Participants are being notified and can answer this question again.',
        confirmLabel: 'OK',
      })
    },
    onReattemptError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not open for reattempt',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const slides = useMemo(() => {
    const list = [{ type: 'participants' }]
    mappedQuestions.forEach((q, i) => list.push({ type: 'question', question: q, questionNumber: i + 1 }))
    if (sessionSupportsOverallLeaderboard(mappedQuestions)) {
      list.push({ type: 'leaderboard' })
    }
    return list
  }, [mappedQuestions])

  const slideTotal = slides.length
  const currentSlide = slides[slideIndex]
  const currentQuestion = currentSlide?.type === 'question' ? currentSlide.question : null

  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(slideTotal - 1, i + 1))
  }, [slideTotal])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      /* ignore */
    }
  }

  if (!sessionId) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100/70 p-8">
        <p className="text-center text-lg text-slate-600">
          Missing session. Open present mode from the Live page.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100/70">
        <p className="text-lg font-medium text-slate-600">Loading presentation…</p>
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100/70 p-8">
        <p className="text-center text-lg text-red-700">Session not found.</p>
      </div>
    )
  }

  const sessionTitle = session.title || 'Live session'
  const participantCount = participants.length
  const isSessionLive = session.status === 'live'

  return (
    <PresentShell
      footer={
        <footer className="relative z-20 flex shrink-0 flex-col gap-3 border-t border-blue-200/50 bg-white/60 px-[clamp(1rem,3vw,3rem)] py-4 backdrop-blur-sm">
          {currentQuestion ? (
            <div className="w-full rounded-xl border border-blue-200/70 bg-white/90 px-4 py-3 shadow-sm">
              <HostQuestionControls
                question={currentQuestion}
                canEditLive={canEditLive}
                singleActiveQuestionMode={singleActiveQuestionMode}
                sessionQuizTotalTimeEnabled={sessionQuizTotalTimeEnabled}
                size="compact"
                showLabel
                questionLiveMutation={questionLiveMutation}
                answerRevealMutation={answerRevealMutation}
                questionLeaderboardMutation={questionLeaderboardMutation}
                closeQuestionMutation={closeQuestionMutation}
                reattemptMutation={reattemptMutation}
                onCloseQuestion={() => closeQuestion(currentQuestion)}
                onOpenForReattempt={() => openForReattempt(currentQuestion)}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <PresentNavButton
              direction="prev"
              label="Previous"
              onClick={goPrev}
              disabled={slideIndex <= 0}
            />
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <p className="hidden text-xs font-medium text-slate-500 sm:block">
                ← → arrow keys to change slides
              </p>
              {canToggleOverallLeaderboard && showSessionControls ? (
                <HostQuestionActionButton
                  disabled={sessionLeaderboardMutation.isPending}
                  icon={Trophy}
                  size="compact"
                  label={
                    sessionLeaderboardMutation.isPending
                      ? 'Updating…'
                      : 'Overall rankings'
                  }
                  title={
                    session?.leaderboard_enabled
                      ? 'Hide session-wide rankings from participants'
                      : 'Show session-wide rankings to participants on its own tab'
                  }
                  active={Boolean(session?.leaderboard_enabled)}
                  tone="amber"
                  onClick={() =>
                    sessionLeaderboardMutation.mutate(!session?.leaderboard_enabled)
                  }
                />
              ) : null}
              {showActivateAllQuestionsButton ? (
                <HostQuestionActionButton
                  disabled={activateAllQuestionsMutation.isPending}
                  icon={Play}
                  size="compact"
                  label={
                    activateAllQuestionsMutation.isPending ? 'Activating…' : 'Activate all questions'
                  }
                  title="Make all questions live at once (timed questions share the same start time)"
                  tone="emerald"
                  onClick={activateAllQuestions}
                />
              ) : null}
              {showCloseAllQuestionsButton ? (
                <HostQuestionActionButton
                  disabled={closeAllQuestionsMutation.isPending}
                  icon={Layers}
                  size="compact"
                  label={closeAllQuestionsMutation.isPending ? 'Closing…' : 'Close all questions'}
                  title="Stop accepting responses on all live untimed questions"
                  tone="rose"
                  onClick={closeAllQuestions}
                />
              ) : null}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-navy-800 shadow-sm transition hover:bg-white"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="size-4" />
                    Exit fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="size-4" />
                    Fullscreen
                  </>
                )}
              </button>
            </div>
            <PresentNavButton
              direction="next"
              label="Next"
              onClick={goNext}
              disabled={slideIndex >= slideTotal - 1}
            />
          </div>
        </footer>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {currentSlide?.type === 'participants' ? (
          <ParticipantsSlide
            session={session}
            participantCount={participantCount}
            qaCount={qaCount}
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
            onQaClick={openQaModal}
          />
        ) : null}

        {currentSlide?.type === 'question' ? (
          <QuestionSlide
            key={currentSlide.question.id}
            accessToken={accessToken}
            sessionTitle={sessionTitle}
            question={currentSlide.question}
            questionNumber={currentSlide.questionNumber}
            allResponses={responses}
            participantCount={participantCount}
            qaCount={qaCount}
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
            onQaClick={openQaModal}
          />
        ) : null}

        {currentSlide?.type === 'leaderboard' ? (
          <LeaderboardSlide
            sessionTitle={sessionTitle}
            leaderboard={leaderboard}
            participantCount={participantCount}
            qaCount={qaCount}
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
            onQaClick={openQaModal}
          />
        ) : null}
      </div>

      <PresentParticipantsModal
        open={participantsModalOpen}
        onClose={() => setParticipantsModalOpen(false)}
        participants={participants}
        isSessionLive={isSessionLive}
      />

      <PresentQaModal
        open={qaModalOpen}
        onClose={() => setQaModalOpen(false)}
        questions={qaQuestions}
        isSessionLive={isSessionLive}
      />

      <HostAlertModal
        open={Boolean(hostAlert)}
        variant={hostAlert?.variant ?? 'success'}
        title={hostAlert?.title ?? ''}
        message={hostAlert?.message ?? ''}
        confirmLabel={hostAlert?.confirmLabel ?? 'OK'}
        onClose={() => setHostAlert(null)}
      />
    </PresentShell>
  )
}

export default PresentModePage
