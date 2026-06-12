import { useParticipantStore } from '../store/participantStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

let refreshInFlight = null

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function postParticipantRefresh(refreshToken) {
  const response = await fetch(`${API_BASE_URL}/participants/refresh`, {
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
 * Refreshes the participant access token using the persisted refresh token.
 * Concurrent callers share one refresh request.
 */
export function refreshParticipantAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const { participantRefreshToken } = useParticipantStore.getState()
      if (!participantRefreshToken) {
        const err = new Error('No participant refresh token')
        err.status = 401
        throw err
      }
      const payload = await postParticipantRefresh(participantRefreshToken)
      const access_token = payload?.data?.access_token
      if (!access_token) {
        const err = new Error('No access token in refresh response')
        err.status = 500
        throw err
      }
      useParticipantStore.setState({ participantToken: access_token })
      return access_token
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/**
 * Authenticated JSON request for participant APIs. Uses the latest access token
 * from the participant store. On 401, attempts one refresh + retry.
 */
export async function participantAuthRequest(path, _ignoredToken, options = {}) {
  const { _skipRefresh, ...fetchOptions } = options

  const execute = async (afterRefresh) => {
    const { participantToken, participantRefreshToken, clearParticipant } =
      useParticipantStore.getState()
    if (!participantToken) {
      const err = new Error('Not authenticated')
      err.status = 401
      throw err
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`,
        ...(fetchOptions.headers || {}),
      },
    })

    const payload = await parseJson(response)

    if (
      response.status === 401 &&
      participantRefreshToken &&
      !_skipRefresh &&
      !afterRefresh
    ) {
      try {
        await refreshParticipantAccessToken()
        return execute(true)
      } catch {
        clearParticipant()
        const err = new Error(payload?.message || 'Participant session expired')
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
