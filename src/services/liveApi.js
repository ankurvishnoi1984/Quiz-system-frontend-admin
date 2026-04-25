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

export async function listDepartmentSessionsApi(accessToken, deptId) {
  const data = await authRequest(`/departments/${deptId}/sessions`, accessToken)
  return data?.sessions || []
}

export async function listSessionQuestionsApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/questions`, accessToken)
  return data?.questions || []
}

export async function getQuestionResultsApi(accessToken, questionId) {
  const data = await authRequest(`/responses/question/${questionId}`, accessToken)
  return data?.results || null
}

export async function getSessionResponsesApi(accessToken, sessionId) {
  const data = await authRequest(`/responses/session/${sessionId}`, accessToken)
  return data?.responses || []
}

export async function listQaQuestionsApi(accessToken, sessionId) {
  const data = await authRequest(`/qa/${sessionId}/questions`, accessToken)
  return data?.questions || []
}

export async function transitionSessionApi(accessToken, sessionId, action) {
  const data = await authRequest(`/sessions/${sessionId}/${action}`, accessToken, { method: 'POST' })
  return data?.session || null
}

export async function setQuestionLiveStateApi(accessToken, questionId, isLive) {
  const endpoint = isLive ? 'activate' : 'deactivate'
  const data = await authRequest(`/questions/${questionId}/${endpoint}`, accessToken, { method: 'POST' })
  return data?.question || null
}

export async function qaModerateApi(accessToken, qaId, action, body = null) {
  const data = await authRequest(`/qa/${qaId}/${action}`, accessToken, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
  return data?.qa_question || null
}
