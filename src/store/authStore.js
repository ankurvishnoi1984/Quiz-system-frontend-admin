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
          const fetchUser = async (token) => {
            const meResponse = await meApi(token)
            return meResponse?.data?.user || null
          }

          const applyRefresh = async () => {
            if (!refreshToken) {
              const err = new Error('No refresh token')
              err.status = 401
              throw err
            }
            const refreshResponse = await refreshApi(refreshToken)
            const next = refreshResponse?.data?.access_token || null
            if (!next) {
              const err = new Error('Unable to refresh access token')
              err.status = 401
              throw err
            }
            set({ accessToken: next })
            return next
          }

          let token = accessToken

          if (!token) {
            token = await applyRefresh()
          }

          let user
          try {
            user = await fetchUser(token)
          } catch (err) {
            if (err.status === 401 && refreshToken) {
              token = await applyRefresh()
              user = await fetchUser(token)
            } else {
              throw err
            }
          }

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
