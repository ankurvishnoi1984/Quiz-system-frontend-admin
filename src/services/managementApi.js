import { hostAuthRequest } from './hostAuthRequest'

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

export async function createUserApi(accessToken, payload) {
  const data = await authRequest('/users', accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

// Legacy public registration (unused by User Management UI).
// export async function registerUserApi(payload) { ... }
