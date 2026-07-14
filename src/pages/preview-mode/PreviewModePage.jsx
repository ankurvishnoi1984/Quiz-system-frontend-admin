import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLiveSession } from '../../hooks/useLiveSession'
import { getPresentSlideApi } from '../../services/liveApi'
import {
  broadcastPreviewReady,
  subscribePreviewFollow,
} from '../../utils/previewFollow'
import { PreviewFullscreenButton, PreviewShell } from './PreviewShell'
import { PreviewJoinSlide } from './PreviewJoinSlide'
import { PreviewQuestionSlide } from './PreviewQuestionSlide'

function resolveLiveQuestionTarget(questions) {
  const liveIndex = (questions || []).findIndex((q) => q.isLive)
  if (liveIndex < 0) return null
  return {
    screen: 'question',
    questionId: questions[liveIndex].id,
    questionIndex: liveIndex,
  }
}

function PreviewModePage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
  const accessToken = useAuthStore((state) => state.accessToken)

  // null until first resolution — avoids flashing join before the live question is known
  const [screen, setScreen] = useState(null)
  const [followQuestionId, setFollowQuestionId] = useState(null)
  const [followQuestionIndex, setFollowQuestionIndex] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const pendingFollowRef = useRef(null)
  const mappedQuestionsRef = useRef([])
  const didBootstrapRef = useRef(false)

  const applyFollowPayload = useCallback((data, questions) => {
    if (data?.screen === 'question') {
      const byId =
        data.questionId != null
          ? questions.find((q) => Number(q.id) === Number(data.questionId))
          : null
      const byIndex =
        data.questionIndex != null && Number.isFinite(Number(data.questionIndex))
          ? questions[Number(data.questionIndex)]
          : null
      const question = byId || byIndex
      if (question) {
        setScreen('question')
        setFollowQuestionId(question.id)
        setFollowQuestionIndex(
          data.questionIndex != null && Number.isFinite(Number(data.questionIndex))
            ? Number(data.questionIndex)
            : questions.findIndex((q) => Number(q.id) === Number(question.id)),
        )
        pendingFollowRef.current = null
        return
      }
      pendingFollowRef.current = {
        screen: 'question',
        questionId: data.questionId ?? null,
        questionIndex: data.questionIndex ?? null,
      }
      return
    }
    pendingFollowRef.current = null
    setScreen('join')
    setFollowQuestionId(null)
    setFollowQuestionIndex(null)
  }, [])

  const applyPresentSlide = useCallback(
    (data) => {
      const questions = mappedQuestionsRef.current
      const idx = Number(data?.slide_index)
      if (!Number.isFinite(idx) || idx <= 0) {
        // Prefer an already-live question over Present's join slide after refresh.
        const liveTarget = resolveLiveQuestionTarget(questions)
        if (liveTarget) {
          applyFollowPayload(liveTarget, questions)
          return
        }
        applyFollowPayload({ screen: 'join' }, questions)
        return
      }
      const questionIndex = idx - 1
      if (!questions.length) {
        pendingFollowRef.current = {
          screen: 'question',
          questionId: null,
          questionIndex,
        }
        return
      }

      const fromPresent = questions[questionIndex]
      if (fromPresent?.isLive) {
        applyFollowPayload(
          { screen: 'question', questionId: fromPresent.id, questionIndex },
          questions,
        )
        return
      }

      const liveTarget = resolveLiveQuestionTarget(questions)
      if (liveTarget) {
        applyFollowPayload(liveTarget, questions)
        return
      }

      applyFollowPayload({ screen: 'join' }, questions)
    },
    [applyFollowPayload],
  )

  const { session, mappedQuestions, responses, isLoading, isError } = useLiveSession(
    accessToken,
    sessionId,
    {
      mode: 'host',
      onPresentSlideChanged: applyPresentSlide,
    },
  )

  mappedQuestionsRef.current = mappedQuestions

  useEffect(() => {
    if (!sessionId) return undefined
    return subscribePreviewFollow(sessionId, {
      onFollow: (data) => applyFollowPayload(data, mappedQuestionsRef.current),
    })
  }, [sessionId, applyFollowPayload])

  useEffect(() => {
    const pending = pendingFollowRef.current
    if (!pending || !mappedQuestions.length) return
    applyFollowPayload(pending, mappedQuestions)
  }, [mappedQuestions, applyFollowPayload])

  // Bootstrap from live questions as soon as data is ready (no join → question flash on refresh).
  useEffect(() => {
    if (isLoading || !session || didBootstrapRef.current) return

    const liveTarget = resolveLiveQuestionTarget(mappedQuestions)
    if (liveTarget) {
      applyFollowPayload(liveTarget, mappedQuestions)
    } else {
      applyFollowPayload({ screen: 'join' }, mappedQuestions)
    }
    didBootstrapRef.current = true
  }, [isLoading, session, mappedQuestions, applyFollowPayload])

  // If the last live question is closed, fall back to join without waiting for Live tab.
  useEffect(() => {
    if (!didBootstrapRef.current || !mappedQuestions.length) return
    const anyLive = mappedQuestions.some((q) => q.isLive)
    if (anyLive) return
    if (session?.status !== 'live' && session?.status !== 'paused') return
    setScreen('join')
    setFollowQuestionId(null)
    setFollowQuestionIndex(null)
    pendingFollowRef.current = null
  }, [mappedQuestions, session?.status])

  // Catch up to Present Mode if it already advanced (after bootstrap; live Q wins over join).
  useEffect(() => {
    if (!sessionId || !accessToken || isLoading || !didBootstrapRef.current) return undefined
    let cancelled = false
    getPresentSlideApi(accessToken, sessionId)
      .then((data) => {
        if (cancelled || data?.slide_index == null) return
        applyPresentSlide(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId, accessToken, isLoading, applyPresentSlide, mappedQuestions.length])

  useEffect(() => {
    if (!sessionId || isLoading) return undefined
    const timers = [0, 400, 1200].map((ms) =>
      window.setTimeout(() => broadcastPreviewReady(sessionId), ms),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [sessionId, isLoading])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!sessionId || !accessToken) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled || document.fullscreenElement) return
      document.documentElement.requestFullscreen?.().catch(() => {})
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [sessionId, accessToken])

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

  const activeQuestion = useMemo(() => {
    if (screen !== 'question') return null
    if (followQuestionId != null) {
      const byId = mappedQuestions.find((q) => Number(q.id) === Number(followQuestionId))
      if (byId) return byId
    }
    if (followQuestionIndex != null && mappedQuestions[followQuestionIndex]) {
      return mappedQuestions[followQuestionIndex]
    }
    return null
  }, [screen, followQuestionId, followQuestionIndex, mappedQuestions])

  if (!sessionId) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-sky-50 to-blue-100/70 p-8">
        <p className="text-center text-lg text-slate-600">
          Missing session. Open Preview Mode from the Live Present Mode page.
        </p>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-sky-50 to-blue-100/70 p-8">
        <p className="text-center text-lg text-slate-600">Sign in as host to use Preview Mode.</p>
      </div>
    )
  }

  if (isError || (!isLoading && !session)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-sky-50 to-blue-100/70 p-8">
        <p className="text-center text-lg text-red-700">Session not found.</p>
      </div>
    )
  }

  if (isLoading || screen == null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-sky-50 to-blue-100/70">
        <p className="text-lg font-medium text-slate-600">Loading preview…</p>
      </div>
    )
  }

  return (
    <PreviewShell
      footer={
        isFullscreen ? null : (
          <footer className="relative z-20 flex shrink-0 items-center justify-end gap-3 border-t border-blue-200/50 bg-white/60 px-[clamp(1rem,3vw,3rem)] py-4 backdrop-blur-sm">
            <PreviewFullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
          </footer>
        )
      }
    >
      {screen === 'join' || !activeQuestion ? (
        <PreviewJoinSlide session={session} />
      ) : (
        <PreviewQuestionSlide
          key={activeQuestion.id}
          accessToken={accessToken}
          question={activeQuestion}
          allResponses={responses}
        />
      )}
    </PreviewShell>
  )
}

export default PreviewModePage
