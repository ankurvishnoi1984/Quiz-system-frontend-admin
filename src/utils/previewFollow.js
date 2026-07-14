/** Local tab sync: Live Present Mode console → Preview Mode (does not touch Present Mode). */

export const PREVIEW_FOLLOW_MESSAGE = 'preview_follow'
export const PREVIEW_READY_MESSAGE = 'preview_ready'

export function getPreviewFollowChannelName(sessionId) {
  return `quiz-preview-follow:${String(sessionId || '')}`
}

export function buildPreviewModeUrl(sessionId) {
  const params = new URLSearchParams()
  params.set('session', String(sessionId || ''))
  // Mirror Present's ?present=1 handoff so authStore can hydrate from the localStorage mirror.
  params.set('preview', '1')
  return `${window.location.origin}/preview?${params.toString()}`
}

/**
 * Map Present Mode slide index → Preview screen.
 * Present slides: 0 = participants/join, 1..N = questions, then optional ending.
 */
export function mapPresentSlideToPreviewFollow(slideIndex, questionCount, endingType = null) {
  const idx = Number(slideIndex)
  const count = Number(questionCount) || 0
  if (!Number.isFinite(idx) || idx <= 0) {
    return { screen: 'join', questionId: null, questionIndex: null }
  }
  const questionIndex = idx - 1
  if (questionIndex >= 0 && questionIndex < count) {
    return { screen: 'question', questionId: null, questionIndex }
  }
  if (endingType === 'leaderboard' || endingType === 'surveyEnding') {
    return { screen: endingType, questionId: null, questionIndex: null }
  }
  // Unknown ending — stay on last question if any, else join.
  if (count > 0) {
    return { screen: 'question', questionId: null, questionIndex: count - 1 }
  }
  return { screen: 'join', questionId: null, questionIndex: null }
}

/** @typedef {'join' | 'question' | 'leaderboard' | 'surveyEnding'} PreviewScreen */
/** @typedef {{ type: 'preview_follow', sessionId: string, screen: PreviewScreen, questionId: number | null, questionIndex: number | null }} PreviewFollowMessage */
/** @typedef {{ type: 'preview_ready', sessionId: string }} PreviewReadyMessage */

const PREVIEW_SCREENS = new Set(['join', 'question', 'leaderboard', 'surveyEnding'])

/**
 * @param {string|number} sessionId
 * @param {{ screen?: PreviewScreen, questionId?: number | null, questionIndex?: number | null }} payload
 */
export function broadcastPreviewFollow(sessionId, payload = {}) {
  if (typeof BroadcastChannel === 'undefined' || !sessionId) return
  try {
    const channel = new BroadcastChannel(getPreviewFollowChannelName(sessionId))
    const screen = PREVIEW_SCREENS.has(payload.screen) ? payload.screen : 'join'
    /** @type {PreviewFollowMessage} */
    const message = {
      type: PREVIEW_FOLLOW_MESSAGE,
      sessionId: String(sessionId),
      screen,
      questionId:
        payload.questionId != null && Number.isFinite(Number(payload.questionId))
          ? Number(payload.questionId)
          : null,
      questionIndex:
        payload.questionIndex != null && Number.isFinite(Number(payload.questionIndex))
          ? Number(payload.questionIndex)
          : null,
    }
    channel.postMessage(message)
    channel.close()
  } catch {
    /* ignore */
  }
}

export function broadcastPreviewReady(sessionId) {
  if (typeof BroadcastChannel === 'undefined' || !sessionId) return
  try {
    const channel = new BroadcastChannel(getPreviewFollowChannelName(sessionId))
    /** @type {PreviewReadyMessage} */
    channel.postMessage({ type: PREVIEW_READY_MESSAGE, sessionId: String(sessionId) })
    channel.close()
  } catch {
    /* ignore */
  }
}

/**
 * Subscribe to Live ↔ Preview follow channel for a session.
 * @param {string|number} sessionId
 * @param {{ onFollow?: (data: PreviewFollowMessage) => void, onReady?: (data: PreviewReadyMessage) => void }} handlers
 * @returns {() => void} unsubscribe
 */
export function subscribePreviewFollow(sessionId, handlers) {
  const onFollow = typeof handlers === 'function' ? handlers : handlers?.onFollow
  const onReady = typeof handlers === 'function' ? undefined : handlers?.onReady

  if (typeof BroadcastChannel === 'undefined' || !sessionId) return () => {}
  let channel
  try {
    channel = new BroadcastChannel(getPreviewFollowChannelName(sessionId))
  } catch {
    return () => {}
  }
  const handler = (event) => {
    const data = event?.data
    if (!data || String(data.sessionId) !== String(sessionId)) return
    if (data.type === PREVIEW_FOLLOW_MESSAGE) {
      onFollow?.(data)
      return
    }
    if (data.type === PREVIEW_READY_MESSAGE) {
      onReady?.(data)
    }
  }
  channel.addEventListener('message', handler)
  return () => {
    channel.removeEventListener('message', handler)
    channel.close()
  }
}
