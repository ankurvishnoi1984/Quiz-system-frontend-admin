import { create } from 'zustand'

export const useParticipantStore = create((set) => ({
  participantToken: null,
  joinedUser: null,

  setParticipant: ({ token, participant }) =>
    set({
      participantToken: token,
      joinedUser: participant,
    }),

  clearParticipant: () =>
    set({
      participantToken: null,
      joinedUser: null,
    }),
}))