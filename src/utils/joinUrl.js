const trimTrailingSlash = (url) => (url || '').replace(/\/+$/, '')

/**
 * Public origin for participant join links (QR, copy link).
 * Set VITE_PUBLIC_APP_URL in production builds when the app is not served from the API host.
 */
export function getPublicAppOrigin() {
  const configured =
    import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL || ''
  if (configured) return trimTrailingSlash(configured)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function buildSessionJoinUrl(sessionCodeOrId) {
  const code =
    sessionCodeOrId != null ? String(sessionCodeOrId).trim() : ''
  if (!code) return ''
  const origin = getPublicAppOrigin()
  if (!origin) return `/join/${encodeURIComponent(code)}`
  return `${origin}/join/${encodeURIComponent(code)}`
}

function isLocalhostHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  )
}

export function isLocalhostUrl(url) {
  if (!url) return false
  try {
    return isLocalhostHost(new URL(url).hostname)
  } catch {
    return /localhost|127\.0\.0\.1/i.test(String(url))
  }
}

/**
 * Prefer the configured/current public join URL; ignore API localhost URLs in production.
 */
export function resolveSessionJoinUrl(apiJoinUrl, sessionCodeOrId) {
  const localJoinUrl = buildSessionJoinUrl(sessionCodeOrId)
  if (!apiJoinUrl) return localJoinUrl

  const hasConfiguredPublicUrl = Boolean(
    import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL,
  )

  if (hasConfiguredPublicUrl) return localJoinUrl

  if (import.meta.env.PROD && isLocalhostUrl(apiJoinUrl)) {
    return localJoinUrl
  }

  if (isLocalhostUrl(apiJoinUrl) && !isLocalhostUrl(localJoinUrl)) {
    return localJoinUrl
  }

  return apiJoinUrl
}
