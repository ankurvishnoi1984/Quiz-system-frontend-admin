/** @typedef {{ participant_id: number|string, name: string, score: number, attempts?: number }} LeaderboardEntry */

export const LEADERBOARD_LIMIT_OPTIONS = [10, 20, 30, 40, 50]
export const SESSION_LEADERBOARD_TOP_N = 10

export function participantDisplayName(row, participantId) {
  const p = row?.participant
  if (p?.nickname) return String(p.nickname).trim()
  if (p?.email) return String(p.email).trim()
  return `Participant ${participantId}`
}

/**
 * Session-wide scores from response rows (sum of points_earned per participant).
 * @param {Array} responses
 * @param {number} limit
 * @returns {LeaderboardEntry[]}
 */
export function buildSessionLeaderboardFromResponses(responses, limit = 10) {
  const scoreByParticipant = new Map()

  ;(responses || []).forEach((row) => {
    const key = row.participant_id
    const existing = scoreByParticipant.get(key) || {
      participant_id: key,
      name: participantDisplayName(row, key),
      score: 0,
      attempts: 0,
    }
    existing.score += Number(row.points_earned || 0)
    existing.attempts += 1
    scoreByParticipant.set(key, existing)
  })

  return Array.from(scoreByParticipant.values())
    .sort((a, b) => b.score - a.score || (b.attempts || 0) - (a.attempts || 0))
    .slice(0, limit)
}

/**
 * Best score per participant for a single question.
 * @param {Array} responses
 * @param {number|string} questionId
 * @param {number} limit
 * @returns {LeaderboardEntry[]}
 */
export function buildQuestionLeaderboardForQuestion(responses, questionId, limit = 10) {
  const byParticipant = new Map()

  ;(responses || [])
    .filter((row) => Number(row.question_id) === Number(questionId))
    .forEach((row) => {
      const pid = row.participant_id
      const points = Number(row.points_earned || 0)
      const existing = byParticipant.get(pid)
      if (!existing || points > existing.score) {
        byParticipant.set(pid, {
          participant_id: pid,
          name: participantDisplayName(row, pid),
          score: points,
        })
      }
    })

  return Array.from(byParticipant.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function normalizeLeaderboardEntries(entries) {
  return (entries || []).map((row) => ({
    participant_id: row.participant_id,
    name: row.name || row.nickname || 'Anonymous',
    score: Number(row.score ?? 0),
  }))
}
