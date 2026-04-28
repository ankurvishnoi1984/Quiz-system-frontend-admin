const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function authRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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

async function publicRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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

export async function lookupSessionApi(sessionCode) {
  const data = await publicRequest(`/sessions/join/${sessionCode}`)
  return data?.session || null
}

export async function joinSessionApi(sessionCode, payload) {
  const data = await publicRequest(`/sessions/join/${sessionCode}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return {
    participant: data?.participant,
    token: data?.participant_token,
  }
}

export async function submitResponseApi(participantToken, payload) {
  const data = await authRequest('/responses/submit', participantToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.response || null
}

export async function listQaQuestionsApi(participantToken, sessionId) {
  const data = await authRequest(`/qa/${sessionId}/questions`, participantToken)
  return data?.questions || []
}

export async function askQaQuestionApi(participantToken, sessionId, payload) {
  const data = await authRequest(`/qa/${sessionId}/ask`, participantToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.qa_question || null
}

export async function upvoteQaApi(participantToken, qaId) {
  const data = await authRequest(`/qa/${qaId}/upvote`, participantToken, {
    method: 'POST',
  })
  return data?.qa_question || null
}

export async function unvoteQaApi(participantToken, qaId) {
  const data = await authRequest(`/qa/${qaId}/upvote`, participantToken, {
    method: 'DELETE',
  })
  return data?.qa_question || null
}

export async function getSessionDetailApi(participantToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}`, participantToken)
  return data?.session || null
}

export async function listSessionQuestionsApi(participantToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/participantQuestions`, participantToken)
  return data?.questions || []
}

export async function getQuestionResultsApi(participantToken, questionId) {
  const data = await authRequest(`/responses/question/${questionId}`, participantToken)
  return data?.results || null
}