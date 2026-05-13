import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

let refreshInFlight = null

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function postRefresh(refreshToken) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const payload = await parseJson(response)
  if (!response.ok) {
    const err = new Error(payload?.message || 'Refresh failed')
    err.status = response.status
    err.details = payload?.errors || null
    throw err
  }
  return payload
}

/**
 * Refreshes the host access token using the persisted refresh token.
 * Concurrent callers share one refresh request.
 */
export function refreshHostAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const { refreshToken } = useAuthStore.getState()
      if (!refreshToken) {
        const err = new Error('No refresh token')
        err.status = 401
        throw err
      }
      const payload = await postRefresh(refreshToken)
      const access_token = payload?.data?.access_token
      if (!access_token) {
        const err = new Error('No access token in refresh response')
        err.status = 500
        throw err
      }
      useAuthStore.setState({ accessToken: access_token })
      return access_token
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/**
 * Authenticated JSON request for the host portal. Always uses the latest
 * access token from the auth store. On 401, attempts one refresh + retry.
 *
 * @param {string} path - API path including leading slash (e.g. `/sessions/1`)
 * @param {unknown} [_ignoredAccessToken] - legacy; token comes from the store
 * @param {RequestInit & { _skipRefresh?: boolean }} [options]
 */
export async function hostAuthRequest(path, _ignoredAccessToken, options = {}) {
  const { _skipRefresh, ...fetchOptions } = options

  const execute = async (afterRefresh) => {
    const { accessToken, refreshToken, clearAuth } = useAuthStore.getState()
    if (!accessToken) {
      const err = new Error('Not authenticated')
      err.status = 401
      throw err
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(fetchOptions.headers || {}),
      },
    })

    const payload = await parseJson(response)

    if (
      response.status === 401 &&
      refreshToken &&
      !_skipRefresh &&
      !afterRefresh
    ) {
      try {
        await refreshHostAccessToken()
        return execute(true)
      } catch {
        clearAuth()
        const err = new Error(payload?.message || 'Session expired')
        err.status = 401
        err.details = payload?.errors || null
        throw err
      }
    }

    if (!response.ok) {
      const err = new Error(payload?.message || 'Request failed')
      err.status = response.status
      err.details = payload?.errors || null
      throw err
    }

    return payload?.data
  }

  return execute(false)
}
