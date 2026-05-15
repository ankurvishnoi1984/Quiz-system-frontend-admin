import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const initialQuiz = {
  quizResponses: {},
  quizQuestionIndex: 0,
  quizLiveQuestionId: null,
  quizSubmitted: false,
  /** Timed sessions: question ids the participant may no longer edit (submitted or timer moved on) */
  quizSubmittedQuestionIds: {},
  /** Per-question countdown: { [questionId]: { endsAt, frozen } } */
  quizCountdownByQuestion: {},
}

export const useParticipantStore = create(
  persist(
    (set, get) => ({
      participantToken: null,
      joinedUser: null,
      joinedSessionCode: null,

      ...initialQuiz,

      setParticipant: ({ token, participant, sessionCode }) =>
        set({
          participantToken: token,
          joinedUser: participant,
          joinedSessionCode: sessionCode ?? get().joinedSessionCode,
        }),

      clearParticipant: () =>
        set({
          participantToken: null,
          joinedUser: null,
          joinedSessionCode: null,
          ...initialQuiz,
        }),

      resetQuizProgress: () => set({ ...initialQuiz }),

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

      clearQuizSubmissionLocks: () => set({ quizSubmittedQuestionIds: {} }),

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
        joinedUser: state.joinedUser,
        joinedSessionCode: state.joinedSessionCode,
        quizResponses: state.quizResponses,
        quizQuestionIndex: state.quizQuestionIndex,
        quizLiveQuestionId: state.quizLiveQuestionId,
        quizSubmitted: state.quizSubmitted,
        quizSubmittedQuestionIds: state.quizSubmittedQuestionIds,
        quizCountdownByQuestion: state.quizCountdownByQuestion,
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
        return { ...s, quizCountdownByQuestion: byQ, version }
      },
      version: 1,
    },
  ),
)
