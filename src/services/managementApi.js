import { hostAuthRequest } from './hostAuthRequest'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function authRequest(path, accessToken, options = {}) {
  return hostAuthRequest(path, accessToken, options)
}

export async function createClientApi(accessToken, payload) {
  const data = await authRequest('/clients', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.client
}

export async function createDepartmentApi(accessToken, payload) {
  const data = await authRequest('/departments', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data?.department
}

export async function listUsersApi(accessToken) {
  const data = await authRequest('/users', accessToken)
  return data?.users || []
}

export async function registerUserApi(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await parseJson(response)
  if (!response.ok) {
    const error = new Error(body?.message || 'Request failed')
    error.status = response.status
    error.details = body?.errors || null
    throw error
  }
  return body?.data
}
