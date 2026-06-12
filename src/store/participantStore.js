import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pickParticipantProgressState } from '../utils/participantSessionState'

const initialQuiz = {
  quizResponses: {},
  quizQuestionIndex: 0,
  quizLiveQuestionId: null,
  quizSubmitted: false,
  /** Timed sessions: question ids the participant may no longer edit (submitted or timer moved on) */
  quizSubmittedQuestionIds: {},
  /** Multi-nav: question ids submitted via the Submit button (not Next auto-save) */
  quizExplicitSubmittedQuestionIds: {},
  /** Per-question countdown: { [questionId]: { endsAt, frozen } } — frozen = seconds left at submit/session end */
  quizCountdownByQuestion: {},
  /** Untimed: when the participant first saw each question (epoch ms) */
  quizQuestionOpenedAt: {},
}

export const useParticipantStore = create(
  persist(
    (set, get) => ({
      participantToken: null,
      participantRefreshToken: null,
      joinedUser: null,
      joinedSessionCode: null,

      ...initialQuiz,

      setParticipant: ({ token, refreshToken, participant, sessionCode }) =>
        set({
          participantToken: token,
          participantRefreshToken: refreshToken ?? get().participantRefreshToken,
          joinedUser: participant,
          joinedSessionCode: sessionCode ?? get().joinedSessionCode,
        }),

      clearParticipant: () =>
        set({
          participantToken: null,
          participantRefreshToken: null,
          joinedUser: null,
          joinedSessionCode: null,
          ...initialQuiz,
        }),

      resetQuizProgress: () => set({ ...initialQuiz }),

      hydrateQuizProgress: (progress) =>
        set({
          ...initialQuiz,
          ...pickParticipantProgressState(progress),
        }),

      setQuizResponses: (updater) =>
        set((s) => ({
          quizResponses: typeof updater === 'function' ? updater(s.quizResponses) : updater,
        })),

      setQuizQuestionIndex: (updater) =>
        set((s) => ({
          quizQuestionIndex:
            typeof updater === 'function' ? updater(s.quizQuestionIndex) : updater,
        })),

      setQuizLiveQuestionId: (id) => set({ quizLiveQuestionId: id }),

      markQuestionsSubmitted: (questionIds) =>
        set((s) => ({
          quizSubmittedQuestionIds: {
            ...(s.quizSubmittedQuestionIds || {}),
            ...Object.fromEntries(questionIds.map((id) => [String(id), true])),
          },
        })),

      markQuestionsExplicitlySubmitted: (questionIds) =>
        set((s) => ({
          quizExplicitSubmittedQuestionIds: {
            ...(s.quizExplicitSubmittedQuestionIds || {}),
            ...Object.fromEntries(questionIds.map((id) => [String(id), true])),
          },
        })),

      clearQuizSubmissionLocks: () =>
        set({ quizSubmittedQuestionIds: {}, quizExplicitSubmittedQuestionIds: {} }),

      /** Host opened question for reattempt — allow editing and resubmit */
      unlockQuestionForReattempt: (questionId, { timeLimitSeconds = 0 } = {}) => {
        const qid = String(questionId)
        const limit = Number(timeLimitSeconds) || 0
        set((s) => {
          const locks = { ...(s.quizSubmittedQuestionIds || {}) }
          delete locks[qid]
          const explicit = { ...(s.quizExplicitSubmittedQuestionIds || {}) }
          delete explicit[qid]
          const countdowns = { ...(s.quizCountdownByQuestion || {}) }
          if (limit > 0) {
            countdowns[qid] = {
              endsAt: Date.now() + limit * 1000,
              frozen: null,
            }
          } else {
            delete countdowns[qid]
          }
          const openedAt = { ...(s.quizQuestionOpenedAt || {}) }
          delete openedAt[qid]
          return {
            quizSubmittedQuestionIds: locks,
            quizExplicitSubmittedQuestionIds: explicit,
            quizCountdownByQuestion: countdowns,
            quizQuestionOpenedAt: openedAt,
            quizSubmitted: false,
          }
        })
      },

      markQuestionOpened: (questionId) => {
        const qid = String(questionId)
        set((s) => {
          if (s.quizQuestionOpenedAt?.[qid]) return {}
          return {
            quizQuestionOpenedAt: {
              ...(s.quizQuestionOpenedAt || {}),
              [qid]: Date.now(),
            },
          }
        })
      },

      setQuizSubmitted: (value) =>
        set((s) => ({
          quizSubmitted: value,
          ...(value
            ? {}
            : {
                quizCountdownByQuestion: Object.fromEntries(
                  Object.entries(s.quizCountdownByQuestion || {}).map(([id, entry]) => [
                    id,
                    { ...entry, frozen: null },
                  ]),
                ),
              }),
        })),

      setQuizCountdown: ({ questionId, endsAt }) => {
        if (questionId == null) {
          set({ quizCountdownByQuestion: {} })
          return
        }
        const qid = String(questionId)
        set((s) => ({
          quizCountdownByQuestion: {
            ...(s.quizCountdownByQuestion || {}),
            [qid]: {
              ...(s.quizCountdownByQuestion?.[qid] || {}),
              endsAt,
              frozen: null,
            },
          },
        }))
      },

      /** Stop all per-question timers when the host ends the session */
      freezeAllCountdowns: () => {
        const s = get()
        const byQ = s.quizCountdownByQuestion || {}
        const now = Date.now()
        let changed = false
        const next = { ...byQ }
        for (const [qid, entry] of Object.entries(byQ)) {
          if (!entry?.endsAt) continue
          const remaining =
            entry.frozen != null
              ? entry.frozen
              : Math.max(0, Math.ceil((entry.endsAt - now) / 1000))
          next[qid] = { ...entry, frozen: remaining }
          changed = true
        }
        if (changed) set({ quizCountdownByQuestion: next })
      },

      /** Call after a successful submit while a per-question timer is active */
      freezeCountdownAfterSubmit: (questionId) => {
        const s = get()
        const qid = String(questionId)
        const entry = s.quizCountdownByQuestion?.[qid]
        if (!entry?.endsAt) return
        const remaining = Math.max(0, Math.ceil((entry.endsAt - Date.now()) / 1000))
        set((state) => ({
          quizCountdownByQuestion: {
            ...(state.quizCountdownByQuestion || {}),
            [qid]: { ...entry, frozen: remaining },
          },
        }))
      },
    }),
    {
      name: 'participant-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        participantToken: state.participantToken,
        participantRefreshToken: state.participantRefreshToken,
        joinedUser: state.joinedUser,
        joinedSessionCode: state.joinedSessionCode,
        quizResponses: state.quizResponses,
        quizQuestionIndex: state.quizQuestionIndex,
        quizLiveQuestionId: state.quizLiveQuestionId,
        quizSubmitted: state.quizSubmitted,
        quizSubmittedQuestionIds: state.quizSubmittedQuestionIds,
        quizExplicitSubmittedQuestionIds: state.quizExplicitSubmittedQuestionIds,
        quizCountdownByQuestion: state.quizCountdownByQuestion,
        quizQuestionOpenedAt: state.quizQuestionOpenedAt,
      }),
      migrate: (persistedState, version) => {
        const s = persistedState || {}
        const byQ = { ...(s.quizCountdownByQuestion || {}) }
        const legacyId = s.quizCountdownQuestionId
        const legacyEnds = s.quizCountdownEndsAt
        if (legacyId != null && legacyEnds != null && !byQ[String(legacyId)]) {
          byQ[String(legacyId)] = {
            endsAt: legacyEnds,
            frozen: s.quizCountdownFrozen ?? null,
          }
        }
        return {
          ...s,
          quizCountdownByQuestion: byQ,
          participantRefreshToken: s.participantRefreshToken ?? null,
          version,
        }
      },
      version: 2,
    },
  ),
)
