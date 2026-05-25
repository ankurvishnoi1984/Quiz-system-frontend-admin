import { LeaderboardModalShell } from './LeaderboardModalShell'
import { LeaderboardTable } from './LeaderboardTable'

export function SessionLeaderboardModal({ open, onClose, entries, limit, onLimitChange }) {
  return (
    <LeaderboardModalShell
      open={open}
      onClose={onClose}
      eyebrow="Leaderboard"
      title={`Top ${limit}`}
      limit={limit}
      onLimitChange={onLimitChange}
      limitSelectId="session-leaderboard-limit"
    >
      <LeaderboardTable
        entries={entries}
        emptyMessage="Leaderboard will appear once responses start coming in."
      />
    </LeaderboardModalShell>
  )
}
