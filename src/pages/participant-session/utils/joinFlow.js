export function canReuseStoredParticipantSession({
  hasSessionCodeInUrl,
  participantToken,
  joinedSessionCode,
  effectiveSessionCode,
}) {
  if (!hasSessionCodeInUrl) return false
  return (
    Boolean(participantToken) &&
    Boolean(joinedSessionCode) &&
    Boolean(effectiveSessionCode) &&
    joinedSessionCode === effectiveSessionCode
  )
}

/** New participants may only join while the host session is live. */
export function isSessionOpenForNewJoin(status) {
  return status === 'live'
}

export function getSessionNotLiveCopy(status) {
  switch (status) {
    case 'draft':
      return {
        title: 'Session not started yet',
        message:
          'The host has not opened this session for participants. Please check back once the session goes live.',
        tone: 'waiting',
        pollForUpdates: true,
      }
    case 'paused':
      return {
        title: 'Session is paused',
        message:
          'The host has temporarily paused this session. New participants cannot join until the host resumes.',
        tone: 'paused',
        pollForUpdates: true,
      }
    case 'completed':
      return {
        title: 'Session has ended',
        message:
          'This session is no longer active and is not accepting new participants. Thank you for your interest.',
        tone: 'ended',
        pollForUpdates: false,
      }
    case 'archived':
      return {
        title: 'Session unavailable',
        message: 'This session has been archived and is no longer open for participants.',
        tone: 'ended',
        pollForUpdates: false,
      }
    default:
      return {
        title: 'Session not available',
        message: 'This session is not accepting participants right now. Please try again later.',
        tone: 'waiting',
        pollForUpdates: true,
      }
  }
}
