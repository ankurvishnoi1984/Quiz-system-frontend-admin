import { hostAuthRequest } from './hostAuthRequest'

async function authRequest(path, accessToken, options = {}) {
  return hostAuthRequest(path, accessToken, options)
}

export async function listDepartmentsApi(accessToken, clientId) {
  const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : ''
  const data = await authRequest(`/departments${query}`, accessToken)
  return data?.departments || []
}

export async function listClientsApi(accessToken) {
  const data = await authRequest('/clients', accessToken)
  return data?.clients || []
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

export async function duplicateSessionApi(accessToken, sessionId, input = {}) {
  const data = await authRequest(`/sessions/${sessionId}/duplicate`, accessToken, {
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
