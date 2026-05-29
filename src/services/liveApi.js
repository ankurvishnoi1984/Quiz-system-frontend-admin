import { hostAuthRequest } from './hostAuthRequest'

async function authRequest(path, accessToken, options = {}) {
  return hostAuthRequest(path, accessToken, options)
}

export async function getSessionDetailApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}`, accessToken)
  return data?.session || null
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

export async function listSessionParticipantsApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/participants`, accessToken)
  return data?.participants || []
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

export async function setQuestionAnswerRevealedApi(accessToken, questionId, revealed) {
  const endpoint = revealed ? 'reveal-answer' : 'hide-answer'
  const data = await authRequest(`/questions/${questionId}/${endpoint}`, accessToken, { method: 'POST' })
  return data?.question || null
}

export async function setQuestionLeaderboardVisibleApi(accessToken, questionId, visible) {
  const endpoint = visible ? 'show-leaderboard' : 'hide-leaderboard'
  const data = await authRequest(`/questions/${questionId}/${endpoint}`, accessToken, { method: 'POST' })
  return data?.question || null
}

export async function openQuestionForReattemptApi(accessToken, questionId) {
  const data = await authRequest(`/questions/${questionId}/open-reattempt`, accessToken, {
    method: 'POST',
  })
  return data?.question || null
}

export async function closeQuestionSubmissionsApi(accessToken, questionId) {
  const data = await authRequest(`/questions/${questionId}/close`, accessToken, {
    method: 'POST',
  })
  return data?.question || null
}

export async function qaModerateApi(accessToken, qaId, action, body = null) {
  const data = await authRequest(`/qa/${qaId}/${action}`, accessToken, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
  return data?.qa_question || null
}
