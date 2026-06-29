import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  changePasswordApi,
  loginApi,
  meApi,
  refreshApi,
} from '../services/authApi'

const AUTH_STORAGE_KEY = 'auth-storage'
const REMEMBER_ME_KEY = 'auth-remember-me'

function getPersistStorage() {
  if (typeof window === 'undefined') {
    return localStorage
  }
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true' ? localStorage : sessionStorage
}

function isPresentModeHandoff() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('present') === '1'
}

/**
 * Copy auth into localStorage so a newly opened tab (e.g. /present) can read it.
 * sessionStorage is isolated per tab, so window.open would otherwise land on /login.
 */
export function syncAuthForNewBrowserTab() {
  if (typeof window === 'undefined') return

  const data =
    sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY)
  if (!data) return

  localStorage.setItem(AUTH_STORAGE_KEY, data)
}

const authPersistStorage = createJSONStorage(() => ({
  getItem: (name) => {
    const primary = getPersistStorage().getItem(name)
    if (primary) return primary
    // Present mode opens in a new tab; read the short-lived mirror written before window.open.
    if (name === AUTH_STORAGE_KEY && isPresentModeHandoff()) {
      return localStorage.getItem(name)
    }
    return null
  },
  setItem: (name, value) => getPersistStorage().setItem(name, value),
  removeItem: (name) => {
    localStorage.removeItem(name)
    sessionStorage.removeItem(name)
  },
}))

function clearAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

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
      login: async ({ email, password, rememberMe = false }) => {
        localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false')
        clearAuthStorage()

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
      changePassword: async ({ currentPassword, newPassword }) => {
        const { accessToken } = get()
        if (!accessToken) {
          const error = new Error('Not authenticated')
          error.status = 401
          throw error
        }

        set({ isLoading: true, error: null })
        try {
          const response = await changePasswordApi(
            { currentPassword, newPassword },
            accessToken,
          )
          const user = response?.data?.user || null
          const tokens = response?.data?.tokens || {}

          set({
            user,
            accessToken: tokens.access_token || accessToken,
            refreshToken: tokens.refresh_token || get().refreshToken,
            isLoading: false,
            error: null,
          })

          return user
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Password change failed',
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
      logout: () => {
        clearAuthStorage()
        localStorage.removeItem(REMEMBER_ME_KEY)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: authPersistStorage,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
