import { hostAuthRequest } from './hostAuthRequest'

export async function getWebSocketMonitorApi(accessToken) {
  const data = await hostAuthRequest('/monitor/websockets', accessToken)
  return data?.monitor || null
}
