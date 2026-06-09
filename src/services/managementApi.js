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
