import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { loginApi, meApi, refreshApi } from '../services/authApi'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isBootstrapping: true,
      error: null,
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({
          user,
          accessToken,
          refreshToken,
          error: null,
        }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        }),
      login: async ({ email, password }) => {
        set({ isLoading: true, error: null })
        try {
          const response = await loginApi({ email, password })
          const user = response?.data?.user || null
          const tokens = response?.data?.tokens || {}

          set({
            user,
            accessToken: tokens.access_token || null,
            refreshToken: tokens.refresh_token || null,
            isLoading: false,
            error: null,
          })

          return user
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
          })
          throw error
        }
      },
      bootstrapAuth: async () => {
        const { accessToken, refreshToken } = get()

        if (!accessToken && !refreshToken) {
          set({ isBootstrapping: false })
          return
        }

        set({ isBootstrapping: true, error: null })

        try {
          let activeAccessToken = accessToken

          if (!activeAccessToken && refreshToken) {
            const refreshResponse = await refreshApi(refreshToken)
            activeAccessToken = refreshResponse?.data?.access_token || null
            if (!activeAccessToken) {
              throw new Error('Unable to refresh access token')
            }
            set({ accessToken: activeAccessToken })
          }

          const meResponse = await meApi(activeAccessToken)
          const user = meResponse?.data?.user || null

          set({
            user,
            isBootstrapping: false,
            error: null,
          })
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isBootstrapping: false,
            error: null,
          })
        }
      },
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
