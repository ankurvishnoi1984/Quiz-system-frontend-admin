import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Maximize2, Minimize2, Trophy } from 'lucide-react'
import { HostAlertModal } from '../../components/live/HostAlertModal'
import { HostQuestionActionButton } from '../../components/live/HostQuestionActionButton'
import { HostQuestionControls } from '../../components/live/HostQuestionControls'
import { useAuthStore } from '../../store/authStore'
import { useHostQuestionMutations } from '../../hooks/useHostQuestionMutations'
import { useLiveSession } from '../../hooks/useLiveSession'
import { updateSessionApi } from '../../services/liveApi'
import { sessionSupportsOverallLeaderboard } from '../../utils/livePresentation'
import { isSessionQuizTotalTimeEnabled } from '../../utils/sessionFlags'
import { LeaderboardSlide } from './LeaderboardSlide'
import { ParticipantsSlide } from './ParticipantsSlide'
import { PresentNavButton, PresentShell } from './PresentShell'
import { PresentParticipantsModal } from './PresentParticipantsModal'
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

  const openParticipantsModal = useCallback(() => setParticipantsModalOpen(true), [])

  const canEditLive = session?.status === 'live'
  const showSessionControls = session?.status === 'live' || session?.status === 'paused'
  const canToggleOverallLeaderboard = sessionSupportsOverallLeaderboard(mappedQuestions)
  const singleActiveQuestionMode = session?.participant_navigation_enabled === false
  const sessionQuizTotalTimeEnabled = isSessionQuizTotalTimeEnabled(session)

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
        title: 'Could not update leaderboard',
        message: 'Unable to update the overall leaderboard setting. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const {
    questionLiveMutation,
    questionLeaderboardMutation,
    answerRevealMutation,
    closeQuestionMutation,
    reattemptMutation,
    openForReattempt,
    closeQuestion,
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
                      : session?.leaderboard_enabled
                        ? 'Overall leaderboard'
                        : 'Overall leaderboard'
                  }
                  title={
                    session?.leaderboard_enabled
                      ? 'Hide session-wide leaderboard from participants'
                      : 'Show session-wide leaderboard to participants on its own tab'
                  }
                  active={Boolean(session?.leaderboard_enabled)}
                  tone="amber"
                  onClick={() =>
                    sessionLeaderboardMutation.mutate(!session?.leaderboard_enabled)
                  }
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
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
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
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
          />
        ) : null}

        {currentSlide?.type === 'leaderboard' ? (
          <LeaderboardSlide
            sessionTitle={sessionTitle}
            leaderboard={leaderboard}
            participantCount={participantCount}
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
          />
        ) : null}
      </div>

      <PresentParticipantsModal
        open={participantsModalOpen}
        onClose={() => setParticipantsModalOpen(false)}
        participants={participants}
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
