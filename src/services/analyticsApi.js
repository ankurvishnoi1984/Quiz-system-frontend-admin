import { hostAuthRequest } from './hostAuthRequest'

async function authRequest(path, accessToken, options = {}) {
  return hostAuthRequest(path, accessToken, options)
}

export async function getSessionReportApi(accessToken, sessionId) {
  const data = await authRequest(`/analytics/session/${sessionId}/report`, accessToken)
  return data?.report || null
}

export async function getSessionSummaryReportApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/report/summary`, accessToken)
  return data?.report || null
}

export async function getSessionQuestionsReportApi(accessToken, sessionId) {
  const data = await authRequest(`/sessions/${sessionId}/report/questions`, accessToken)
  return data?.report || null
}

export async function getDepartmentOverviewApi(accessToken, deptId) {
  const data = await authRequest(`/analytics/dept/${deptId}/overview`, accessToken)
  return data?.overview || null
}

export async function getDepartmentSessionsAnalyticsApi(accessToken, deptId) {
  const data = await authRequest(`/analytics/dept/${deptId}/sessions`, accessToken)
  return data?.sessions || []
}

export async function getClientOverviewApi(accessToken, clientId) {
  const data = await authRequest(`/analytics/client/${clientId}/overview`, accessToken)
  return data?.overview || null
}

export async function downloadDepartmentExportApi(accessToken, deptId, type = 'csv') {
  const query = type && type !== 'csv' ? `?type=${encodeURIComponent(type)}` : ''
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
  const response = await fetch(`${API_BASE_URL}/analytics/dept/${deptId}/export${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || 'Export failed')
  }
  return response.text()
}
