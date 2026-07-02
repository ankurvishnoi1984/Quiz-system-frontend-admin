const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function viewerRequest(path, viewerToken, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`,
      ...(options.headers || {}),
    },
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    const err = new Error(payload?.message || 'Request failed')
    err.status = response.status
    err.details = payload?.errors || null
    throw err
  }

  return payload?.data
}

export async function getPresentViewSessionApi(viewerToken, sessionId) {
  const data = await viewerRequest(`/present-view/sessions/${sessionId}`, viewerToken)
  return data?.session || null
}

export async function listPresentViewQuestionsApi(viewerToken, sessionId) {
  const data = await viewerRequest(`/present-view/sessions/${sessionId}/questions`, viewerToken)
  return data?.questions || []
}

export async function getPresentViewQuestionResultsApi(viewerToken, questionId) {
  const data = await viewerRequest(`/present-view/responses/question/${questionId}`, viewerToken)
  return data?.results || null
}

export async function getPresentViewResponsesApi(viewerToken, sessionId) {
  const data = await viewerRequest(`/present-view/sessions/${sessionId}/responses`, viewerToken)
  return data?.responses || []
}

export async function listPresentViewParticipantsApi(viewerToken, sessionId) {
  const data = await viewerRequest(`/present-view/sessions/${sessionId}/participants`, viewerToken)
  return data?.participants || []
}

export async function listPresentViewQaApi(viewerToken, sessionId) {
  const data = await viewerRequest(`/present-view/sessions/${sessionId}/qa`, viewerToken)
  return data?.questions || []
}

export async function getPresentViewSlideApi(viewerToken, sessionId) {
  return viewerRequest(`/present-view/sessions/${sessionId}/present-slide`, viewerToken)
}
