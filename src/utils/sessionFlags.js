/** Session flag is enabled only for explicit true / 1 (MySQL tinyint safe). */
export function isAllowLateJoinEnabled(value) {
  return value === true || value === 1 || value === '1'
}

export function isStrictLateJoinSession(session) {
  return !isAllowLateJoinEnabled(session?.allow_late_join)
}
