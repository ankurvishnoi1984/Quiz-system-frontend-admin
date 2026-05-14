import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const initialQuiz = {
  quizResponses: {},
  quizQuestionIndex: 0,
  quizLiveQuestionId: null,
  quizSubmitted: false,
  /** Timed sessions: question ids the participant may no longer edit (submitted or timer moved on) */
  quizSubmittedQuestionIds: {},
  /** Wall-clock ms when the active question's countdown reaches zero */
  quizCountdownEndsAt: null,
  /** Question id that `quizCountdownEndsAt` applies to */
  quizCountdownQuestionId: null,
  /** Seconds remaining shown after submit (countdown UI stops ticking) */
  quizCountdownFrozen: null,
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
        set({
          quizSubmitted: value,
          ...(value ? {} : { quizCountdownFrozen: null }),
        }),

      setQuizCountdown: ({ questionId, endsAt }) =>
        set({
          quizCountdownQuestionId: questionId,
          quizCountdownEndsAt: endsAt,
          quizCountdownFrozen: null,
        }),

      /** Call after a successful submit while a per-question timer is active */
      freezeCountdownAfterSubmit: () => {
        const s = get()
        if (!s.quizCountdownEndsAt) return
        const remaining = Math.max(0, Math.ceil((s.quizCountdownEndsAt - Date.now()) / 1000))
        set({ quizCountdownFrozen: remaining })
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
        quizCountdownEndsAt: state.quizCountdownEndsAt,
        quizCountdownQuestionId: state.quizCountdownQuestionId,
        quizCountdownFrozen: state.quizCountdownFrozen,
      }),
    },
  ),
)
