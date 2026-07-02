import { emojiDistributionFromReport } from '../../utils/emojiReaction'

function StatBlock({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-navy-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  )
}

function DistributionTable({ title, columns, rows, emptyMessage }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-navy-900">{title}</p>
      {rows?.length ? (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-blue-200/70">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60 text-left">
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-2 font-semibold text-slate-700">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-blue-50 last:border-b-0">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 text-slate-700">
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">{emptyMessage}</p>
      )}
    </div>
  )
}

export function PerQuestionReportDetails({ questionReport }) {
  if (!questionReport) return null

  const {
    response_count: responseCount,
    response_rate_percent: responseRate,
    correct_rate_percent: correctRate,
    avg_response_time_seconds: avgTime,
    fastest_responders: fastestResponders,
    rating_distribution: ratingDistribution,
    word_frequency: wordFrequency,
    chart_type: chartType,
    is_survey: isSurvey,
    is_quiz_mode: isQuizMode,
    average_rating: averageRating,
    open_text_responses: openTextResponses,
  } = questionReport

  const showCorrectRate = !isSurvey && isQuizMode

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-blue-200/70 bg-white p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-700">
          Per-question report
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Response metrics, timing, and type-specific breakdown
        </p>
      </div>

      <div className={`grid gap-3 sm:grid-cols-2 ${showCorrectRate ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        <StatBlock
          label="Responses"
          value={responseCount}
          hint={`${responseRate}% of ${questionReport.total_participants ?? '—'} joined`}
        />
        <StatBlock label="Response rate" value={`${responseRate}%`} hint="Responses / total joined" />
        {showCorrectRate ? (
          <StatBlock
            label="Correct rate"
            value={correctRate != null ? `${correctRate}%` : '—'}
            hint="Quiz mode question"
          />
        ) : null}
        <StatBlock
          label="Avg response time"
          value={avgTime != null ? `${avgTime}s` : '—'}
          hint="Average among timed responses"
        />
      </div>

      {chartType === 'rating' && averageRating != null ? (
        <StatBlock
          label="Average rating"
          value={averageRating}
          hint="Mean score across all rating responses"
        />
      ) : null}

      <div>
        <p className="text-sm font-semibold text-navy-900">Top 3 fastest responders</p>
        {fastestResponders?.length ? (
          <div className="mt-2 space-y-2">
            {fastestResponders.map((responder, index) => (
              <div
                key={`${responder.participant_id}-${index}`}
                className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-navy-900 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-navy-900">{responder.nickname}</span>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {responder.response_time_seconds}s
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No timed responses recorded for this question.</p>
        )}
      </div>

      {chartType === 'rating' ? (
        <DistributionTable
          title="Rating distribution"
          columns={[
            { key: 'value', label: 'Rating' },
            { key: 'count', label: 'Count' },
            { key: 'percent', label: 'Percent' },
          ]}
          rows={(ratingDistribution || []).map((row) => ({
            key: row.value,
            value: row.value,
            count: row.count,
            percent: `${row.percent}%`,
          }))}
          emptyMessage="No ratings submitted yet."
        />
      ) : null}

      {chartType === 'word_cloud' ? (
        <DistributionTable
          title="Word frequency"
          columns={[
            { key: 'word', label: 'Word' },
            { key: 'count', label: 'Count' },
            { key: 'percent', label: 'Percent' },
          ]}
          rows={(wordFrequency || []).map((row) => ({
            key: row.word,
            word: row.word,
            count: row.count,
            percent: `${row.percent}%`,
          }))}
          emptyMessage="No words submitted yet."
        />
      ) : null}

      {chartType === 'emoji_reaction' ? (
        <DistributionTable
          title="Emoji reactions"
          columns={[
            { key: 'emoji', label: 'Emoji' },
            { key: 'count', label: 'Count' },
            { key: 'percent', label: 'Percent' },
          ]}
          rows={emojiDistributionFromReport(questionReport).map((row) => ({
            key: row.emoji,
            emoji: row.emoji,
            count: row.count,
            percent: `${row.percent}%`,
          }))}
          emptyMessage="No emoji reactions yet."
        />
      ) : null}

      {chartType === 'open_text' ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-navy-900">Open text responses</p>
          <div className="mt-2 rounded-2xl border border-blue-200/70 bg-white p-3">
            {(openTextResponses?.length
              ? openTextResponses
              : (questionReport.responses || [])
                  .filter((row) => row.answer)
                  .map((row) => ({
                    id: row.participant_id,
                    participant: row.nickname,
                    text: row.answer,
                  }))
            ).length ? (
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {(openTextResponses?.length
                  ? openTextResponses
                  : (questionReport.responses || []).map((row) => ({
                      id: row.participant_id,
                      participant: row.nickname,
                      text: row.answer,
                    }))
                ).map((row) => (
                  <li
                    key={`${row.id}-${row.text}`}
                    className="rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-navy-700">{row.participant}</p>
                    <p className="mt-1 text-sm leading-snug text-slate-800">{row.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">No text responses yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
