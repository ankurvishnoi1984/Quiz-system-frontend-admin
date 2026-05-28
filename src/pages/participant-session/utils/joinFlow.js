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
