import { useAuthStore } from '../store/authStore'
import { refreshHostAccessToken } from './hostAuthRequest'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function uploadQuestionMediaApi(deptId, file) {
  const execute = async (afterRefresh = false) => {
    const { accessToken, refreshToken, clearAuth } = useAuthStore.getState()
    if (!accessToken) {
      const err = new Error('Not authenticated')
      err.status = 401
      throw err
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('dept_id', String(deptId))

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    const payload = await parseJson(response)

    if (response.status === 401 && refreshToken && !afterRefresh) {
      try {
        await refreshHostAccessToken()
        return execute(true)
      } catch {
        clearAuth()
        const err = new Error(payload?.message || 'Session expired')
        err.status = 401
        throw err
      }
    }

    if (!response.ok) {
      const err = new Error(payload?.message || 'Media upload failed')
      err.status = response.status
      err.details = payload?.errors || null
      throw err
    }

    return {
      assetId: payload?.data?.asset_id ?? null,
      fileUrl: payload?.data?.file_url ?? null,
    }
  }

  return execute(false)
}
