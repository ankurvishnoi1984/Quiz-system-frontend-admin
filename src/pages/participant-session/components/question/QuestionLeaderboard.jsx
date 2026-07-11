import { Trophy } from 'lucide-react'
import { ParticipantRankingList } from '../ParticipantRankingList'

export function QuestionLeaderboard({ entries }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">
        <Trophy className="mr-2 inline size-4" />
        Question rankings
      </p>
      <div className="mt-3">
        <ParticipantRankingList
          entries={entries}
          timeMode="question"
          limit={5}
          compact
          emptyMessage="Rankings will appear as participants answer this question."
        />
      </div>
    </div>
  )
}
