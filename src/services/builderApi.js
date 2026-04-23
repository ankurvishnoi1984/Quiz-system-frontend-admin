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

export async function getSessionDetailApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}`, accessToken)
  return data?.session || null
}

export async function listSessionQuestionsApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/questions`, accessToken)
  return data?.questions || []
}

export async function createQuestionApi(accessToken, sessionId, payload) {
  const data = await authRequest(`/sessions/${sessionId}/questions`, accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.question || null
}

export async function updateQuestionApi(accessToken, questionId, payload) {
  const data = await authRequest(`/questions/${questionId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data?.question || null
}

export async function deleteQuestionApi(accessToken, questionId) {
  await authRequest(`/questions/${questionId}`, accessToken, {
    method: 'DELETE',
  })
}

export async function reorderQuestionsApi(accessToken, sessionId, orderedIds) {
  const data = await authRequest('/questions/reorder', accessToken, {
    method: 'POST',
    body: JSON.stringify({ sessionId: Number(sessionId), orderedIds }),
  })
  return data?.questions || []
}

export async function updateSessionApi(accessToken, sessionId, payload) {
  const data = await authRequest(`/sessions/${sessionId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data?.session || null
}

export async function listDepartmentSessionsApi(accessToken, deptId) {
  const data = await authRequest(`/departments/${deptId}/sessions`, accessToken)
  return data?.sessions || []
}
