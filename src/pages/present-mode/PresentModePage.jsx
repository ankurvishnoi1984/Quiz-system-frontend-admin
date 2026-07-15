import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Layers, Maximize2, Minimize2, Play, Trophy } from 'lucide-react'
import { HostAlertModal } from '../../components/live/HostAlertModal'
import { HostQuestionActionButton } from '../../components/live/HostQuestionActionButton'
import { HostQuestionControls } from '../../components/live/HostQuestionControls'
import { useAuthStore } from '../../store/authStore'
import { useHostQuestionMutations } from '../../hooks/useHostQuestionMutations'
import { useLiveSession } from '../../hooks/useLiveSession'
import {
  getSessionSurveySummaryApi,
  listQaQuestionsApi,
  setPresentSlideApi,
  setQuestionLiveStateApi,
  updateSessionApi,
} from '../../services/liveApi'
import {
  getPresentViewSlideApi,
  getPresentViewSurveySummaryApi,
  listPresentViewQaApi,
} from '../../services/presentViewApi'
import { canHostActivateAllQuestions, canHostCloseAllQuestions } from '../../utils/hostQuestionControls'
import { broadcastPreviewFollow } from '../../utils/previewFollow'
import { sessionSupportsOverallLeaderboard, sessionSupportsSurveyEndingScreen } from '../../utils/livePresentation'
import { isSessionQuizTotalTimeEnabled } from '../../utils/sessionFlags'
import { formatScheduledSessionForDisplay } from '../../utils/sessionSchedule'
import { LeaderboardSlide } from './LeaderboardSlide'
import { PresentSurveyEndingSlide } from './PresentSurveyEndingSlide'
import { ParticipantsSlide } from './ParticipantsSlide'
import { PresentNavButton, PresentShell, PresentSlideHeader } from './PresentShell'
import { PresentParticipantsModal } from './PresentParticipantsModal'
import { PresentQaModal } from './PresentQaModal'
import { QuestionSlide } from './QuestionSlide'

function PresentModePage({ readOnly = false, viewerToken = '', sessionIdOverride = '' } = {}) {
  const [searchParams] = useSearchParams()
  const sessionId = sessionIdOverride || searchParams.get('session') || ''
  const hostAccessToken = useAuthStore((state) => state.accessToken)
  const accessToken = readOnly ? viewerToken : hostAccessToken
  const queryClient = useQueryClient()
  const slideTotalRef = useRef(1)
  const [slideIndex, setSlideIndex] = useState(0)

  const applySyncedSlide = useCallback((data) => {
    const idx = Number(data?.slide_index)
    if (!Number.isFinite(idx)) return
    const total = slideTotalRef.current
    setSlideIndex(Math.min(Math.max(0, idx), Math.max(0, total - 1)))
  }, [])

  const { session, mappedQuestions, responses, participants, leaderboard, isLoading, isError } =
    useLiveSession(accessToken, sessionId, {
      mode: readOnly ? 'viewer' : 'host',
      onPresentSlideChanged: readOnly ? applySyncedSlide : undefined,
    })

  const isViewWaiting = readOnly && session?.status === 'draft'

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hostAlert, setHostAlert] = useState(null)
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false)
  const [qaModalOpen, setQaModalOpen] = useState(false)

  const openParticipantsModal = useCallback(() => setParticipantsModalOpen(true), [])
  const openQaModal = useCallback(() => setQaModalOpen(true), [])

  const qaQuery = useQuery({
    queryKey: ['live-qa', sessionId, readOnly ? 'viewer' : 'host'],
    queryFn: () =>
      readOnly
        ? listPresentViewQaApi(accessToken, sessionId)
        : listQaQuestionsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    refetchInterval: session?.status === 'live' ? 5000 : false,
  })

  const qaQuestions = qaQuery.data || []
  const qaCount = qaQuestions.length

  const canEditLive = !readOnly && session?.status === 'live'
  const showSessionControls = !readOnly && (session?.status === 'live' || session?.status === 'paused')
  const canToggleOverallLeaderboard = sessionSupportsOverallLeaderboard(mappedQuestions)
  const canToggleSurveyResults = sessionSupportsSurveyEndingScreen(mappedQuestions)
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

  const clearSessionEndingScreens = useCallback(async () => {
    if (readOnly || !hostAccessToken) return null
    const current =
      queryClient.getQueryData(['live-session', sessionId]) ||
      queryClient.getQueryData(['live-session', sessionId, 'host']) ||
      session
    const clearLb = Boolean(current?.leaderboard_enabled)
    const clearSurvey = Boolean(current?.survey_results_enabled)
    if (!clearLb && !clearSurvey) return null

    const updated = await updateSessionApi(hostAccessToken, sessionId, {
      ...(clearLb ? { leaderboard_enabled: false } : {}),
      ...(clearSurvey ? { survey_results_enabled: false } : {}),
    })
    if (updated) {
      const patch = {
        leaderboard_enabled: updated.leaderboard_enabled,
        survey_results_enabled: updated.survey_results_enabled,
      }
      queryClient.setQueryData(['live-session', sessionId], (old) =>
        old ? { ...old, ...updated, ...patch } : updated,
      )
      queryClient.setQueryData(['live-session', sessionId, 'host'], (old) =>
        old ? { ...old, ...updated, ...patch } : old,
      )
    }
    queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
    return updated
  }, [readOnly, hostAccessToken, queryClient, sessionId, session])

  const deactivateAllLiveQuestions = useCallback(async () => {
    if (readOnly || !hostAccessToken) return
    const liveQuestions = mappedQuestions.filter((q) => q.isLive)
    if (!liveQuestions.length) return
    await Promise.all(
      liveQuestions.map((q) => setQuestionLiveStateApi(hostAccessToken, q.id, false)),
    )
    queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
  }, [readOnly, hostAccessToken, mappedQuestions, queryClient, sessionId])

  const sessionLeaderboardMutation = useMutation({
    mutationFn: async (enabled) => {
      if (enabled) await deactivateAllLiveQuestions()
      return updateSessionApi(hostAccessToken, sessionId, { leaderboard_enabled: enabled })
    },
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
        queryClient.setQueryData(['live-session', sessionId, 'host'], (old) =>
          old
            ? {
                ...old,
                ...updated,
                leaderboard_enabled: updated.leaderboard_enabled,
              }
            : old,
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

  const sessionSurveyResultsMutation = useMutation({
    mutationFn: async (enabled) => {
      if (enabled) await deactivateAllLiveQuestions()
      return updateSessionApi(hostAccessToken, sessionId, { survey_results_enabled: enabled })
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(['live-session', sessionId], (old) =>
          old
            ? {
                ...old,
                ...updated,
                survey_results_enabled: updated.survey_results_enabled,
              }
            : updated,
        )
        queryClient.setQueryData(['live-session', sessionId, 'host'], (old) =>
          old
            ? {
                ...old,
                ...updated,
                survey_results_enabled: updated.survey_results_enabled,
              }
            : old,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
    },
    onError: () => {
      setHostAlert({
        variant: 'error',
        title: 'Could not update survey results',
        message: 'Unable to update the survey results setting. Please try again.',
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
  } = useHostQuestionMutations(hostAccessToken, sessionId, {
    clearEndingScreensOnActivate: clearSessionEndingScreens,
    onQuestionLiveSuccess: (variables) => {
      if (!variables?.isLive || variables.questionId == null || !sessionId) return
      const activatedId = Number(variables.questionId)
      queryClient.setQueryData(['live-questions', sessionId, 'host'], (old) => {
        if (!Array.isArray(old)) return old
        return old.map((q) => {
          const id = Number(q.question_id)
          if (id === activatedId) return { ...q, is_live: true }
          if (q.is_live) return { ...q, is_live: false }
          return q
        })
      })
      const idx = mappedQuestions.findIndex((q) => Number(q.id) === activatedId)
      broadcastPreviewFollow(sessionId, {
        screen: 'question',
        questionId: activatedId,
        questionIndex: idx >= 0 ? idx : null,
      })
    },
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
    } else if (sessionSupportsSurveyEndingScreen(mappedQuestions)) {
      list.push({ type: 'surveyEnding' })
    }
    return list
  }, [mappedQuestions])

  const surveySummaryQuery = useQuery({
    queryKey: ['present-survey-summary', sessionId, readOnly ? 'viewer' : 'host'],
    queryFn: () =>
      readOnly
        ? getPresentViewSurveySummaryApi(accessToken, sessionId)
        : getSessionSurveySummaryApi(accessToken, sessionId),
    enabled: Boolean(
      accessToken &&
        sessionId &&
        sessionSupportsSurveyEndingScreen(mappedQuestions) &&
        !isViewWaiting,
    ),
    staleTime: 5000,
    refetchInterval: session?.status === 'live' ? 5000 : false,
  })

  const slideTotal = slides.length
  slideTotalRef.current = slideTotal
  const currentSlide = slides[slideIndex]
  const currentQuestion = currentSlide?.type === 'question' ? currentSlide.question : null

  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(slideTotal - 1, i + 1))
  }, [slideTotal])

  useEffect(() => {
    setSlideIndex(0)
  }, [sessionId])

  useEffect(() => {
    setSlideIndex((index) => Math.min(index, Math.max(0, slideTotal - 1)))
  }, [slideTotal])

  useEffect(() => {
    if (!readOnly || !accessToken || !sessionId || isViewWaiting) return
    getPresentViewSlideApi(accessToken, sessionId).then(applySyncedSlide).catch(() => {})
  }, [readOnly, accessToken, sessionId, isViewWaiting, applySyncedSlide, slideTotal])

  useEffect(() => {
    if (readOnly || !hostAccessToken || !sessionId || isViewWaiting || slideTotal < 1) return
    setPresentSlideApi(hostAccessToken, sessionId, {
      slideIndex,
      slideTotal,
    }).catch(() => {})
  }, [readOnly, hostAccessToken, sessionId, slideIndex, slideTotal, isViewWaiting])

  useEffect(() => {
    if (isViewWaiting || readOnly) return undefined
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
  }, [goPrev, goNext, isViewWaiting])

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
          {readOnly
            ? 'Invalid display link. Ask the host for a new view-only link.'
            : 'Missing session. Open present mode from the Live page.'}
        </p>
      </div>
    )
  }

  if (readOnly && !viewerToken) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100/70 p-8">
        <p className="text-center text-lg text-slate-600">
          This display link is missing its access token. Ask the host to share a new link.
        </p>
      </div>
    )
  }

  if (!readOnly && !hostAccessToken) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100/70 p-8">
        <p className="text-center text-lg text-slate-600">Sign in as host to use present mode.</p>
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
        <p className="text-center text-lg text-red-700">
          {readOnly
            ? 'This display link is invalid or has expired. Ask the host for a new link.'
            : 'Session not found.'}
        </p>
      </div>
    )
  }

  const sessionTitle = session.title || 'Live session'
  const participantCount = participants.length
  const isSessionLive = session.status === 'live'
  const scheduledLabel = formatScheduledSessionForDisplay(
    session?.scheduled_date,
    session?.scheduled_time,
  )

  const renderFooterNav = () => {
    if (isViewWaiting || readOnly) {
      return (
        <div className="flex justify-center">
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
      )
    }

    return (
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
          {!readOnly && canToggleOverallLeaderboard && showSessionControls ? (
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
          {!readOnly && canToggleSurveyResults && showSessionControls ? (
            <HostQuestionActionButton
              disabled={sessionSurveyResultsMutation.isPending}
              icon={BarChart3}
              size="compact"
              label={
                sessionSurveyResultsMutation.isPending ? 'Updating…' : 'Survey results'
              }
              title={
                session?.survey_results_enabled
                  ? 'Hide the survey ending screen from participants'
                  : 'Show the survey ending screen to participants before the session ends'
              }
              active={Boolean(session?.survey_results_enabled)}
              tone="sky"
              onClick={() =>
                sessionSurveyResultsMutation.mutate(!session?.survey_results_enabled)
              }
            />
          ) : null}
          {!readOnly && showActivateAllQuestionsButton ? (
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
          {!readOnly && showCloseAllQuestionsButton ? (
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
    )
  }

  return (
    <PresentShell
      footer={
        <footer className="relative z-20 flex shrink-0 flex-col gap-3 border-t border-blue-200/50 bg-white/60 px-[clamp(1rem,3vw,3rem)] py-4 backdrop-blur-sm">
          {!readOnly && !isViewWaiting && currentQuestion ? (
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

          {renderFooterNav()}
        </footer>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {isViewWaiting ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <PresentSlideHeader
              sessionTitle={sessionTitle}
              participantCount={participantCount}
              qaCount={qaCount}
              isSessionLive={false}
              onParticipantsClick={openParticipantsModal}
              onQaClick={openQaModal}
              readOnly
            />
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(1rem,4vw,3rem)] text-center">
              <div className="max-w-2xl rounded-3xl border border-blue-200/70 bg-white/95 px-[clamp(1.5rem,4vw,3rem)] py-[clamp(2rem,6vh,3.5rem)] shadow-xl shadow-navy-900/10">
                <p className="text-[clamp(0.75rem,1.4vw,0.9rem)] font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Waiting for host
                </p>
                <h2 className="mt-4 text-[clamp(1.75rem,5vw,3rem)] font-bold leading-tight text-navy-900">
                  Session not started yet
                </h2>
                <p className="mt-4 text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-slate-600">
                  The host has not launched this session. This screen will update automatically when
                  the session goes live.
                </p>
                {scheduledLabel ? (
                  <p className="mt-6 text-[clamp(0.95rem,1.8vw,1.1rem)] font-semibold text-navy-700">
                    Scheduled for {scheduledLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!isViewWaiting && currentSlide?.type === 'participants' ? (
          <ParticipantsSlide
            session={session}
            participantCount={participantCount}
            qaCount={qaCount}
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
            onQaClick={openQaModal}
            readOnly={readOnly}
          />
        ) : null}

        {!isViewWaiting && currentSlide?.type === 'question' ? (
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
            readOnly={readOnly}
          />
        ) : null}

        {!isViewWaiting && currentSlide?.type === 'leaderboard' ? (
          <LeaderboardSlide
            sessionTitle={sessionTitle}
            leaderboard={leaderboard}
            participantCount={participantCount}
            qaCount={qaCount}
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
            onQaClick={openQaModal}
            readOnly={readOnly}
          />
        ) : null}

        {!isViewWaiting && currentSlide?.type === 'surveyEnding' ? (
          <PresentSurveyEndingSlide
            sessionTitle={sessionTitle}
            summary={surveySummaryQuery.data}
            isLoading={surveySummaryQuery.isLoading}
            participantCount={participantCount}
            qaCount={qaCount}
            isSessionLive={isSessionLive}
            onParticipantsClick={openParticipantsModal}
            onQaClick={openQaModal}
            readOnly={readOnly}
          />
        ) : null}
      </div>

      <PresentParticipantsModal
        open={participantsModalOpen}
        onClose={() => setParticipantsModalOpen(false)}
        participants={participants}
        isSessionLive={isSessionLive}
        readOnly={readOnly}
      />

      <PresentQaModal
        open={qaModalOpen}
        onClose={() => setQaModalOpen(false)}
        questions={qaQuestions}
        isSessionLive={isSessionLive}
        readOnly={readOnly}
      />

      {!readOnly ? (
        <HostAlertModal
          open={Boolean(hostAlert)}
          variant={hostAlert?.variant ?? 'success'}
          title={hostAlert?.title ?? ''}
          message={hostAlert?.message ?? ''}
          confirmLabel={hostAlert?.confirmLabel ?? 'OK'}
          onClose={() => setHostAlert(null)}
        />
      ) : null}
    </PresentShell>
  )
}

export default PresentModePage
