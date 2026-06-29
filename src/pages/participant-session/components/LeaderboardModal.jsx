import { normalizeLeaderboardEntries } from '../../../utils/leaderboard'
import { LeaderboardModalShell } from '../../../components/leaderboard/LeaderboardModalShell'
import { LeaderboardTable } from '../../../components/leaderboard/LeaderboardTable'

export function LeaderboardModal({ open, leaderboard, onClose }) {
  const entries = normalizeLeaderboardEntries(leaderboard)

  return (
    <LeaderboardModalShell
      open={open}
      onClose={onClose}
      eyebrow="Rankings"
      title="Top Participants"
    >
      <LeaderboardTable entries={entries} emptyMessage="No scores yet." />
    </LeaderboardModalShell>
  )
}
