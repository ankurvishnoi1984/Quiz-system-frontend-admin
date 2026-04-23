const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function authRequest(path, accessToken, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed')
    error.status = response.status
    error.details = payload?.errors || null
    throw error
  }

  return payload?.data
}

export async function listDepartmentsApi(accessToken, clientId) {
  const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : ''
  const data = await authRequest(`/departments${query}`, accessToken)
  return data?.departments || []
}

export async function listDepartmentSessionsApi(accessToken, deptId) {
  const data = await authRequest(`/departments/${deptId}/sessions`, accessToken)
  return data?.sessions || []
}

export async function createSessionApi(accessToken, deptId, input) {
  const data = await authRequest(`/departments/${deptId}/sessions`, accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data?.session
}

export async function archiveSessionApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}`, accessToken, {
    method: 'DELETE',
  })
  return data?.session
}

export async function transitionSessionApi(accessToken, sessionId, action) {
  const data = await authRequest(`/sessions/${sessionId}/${action}`, accessToken, {
    method: 'POST',
  })
  return data?.session
}

export async function getSessionQrApi(accessToken, sessionId) {
  return authRequest(`/sessions/${sessionId}/qr`, accessToken)
}
