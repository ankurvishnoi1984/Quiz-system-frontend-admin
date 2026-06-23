const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const { headers, ...rest } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    const details = Array.isArray(payload?.errors) ? payload.errors : null
    const message = details?.length
      ? details.join('. ')
      : payload?.message || 'Request failed'
    const error = new Error(message)
    error.status = response.status
    error.details = details
    throw error
  }

  return payload
}

export async function loginApi({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function forgotPasswordApi({ email }) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function changePasswordApi({ currentPassword, newPassword }, accessToken) {
  if (!newPassword) {
    throw new Error('New password is required')
  }

  const body = { new_password: newPassword }
  if (currentPassword) {
    body.current_password = currentPassword
  }

  return request('/auth/change-password', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })
}

export async function meApi(accessToken) {
  return request('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

export async function refreshApi(refreshToken) {
  return request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}
