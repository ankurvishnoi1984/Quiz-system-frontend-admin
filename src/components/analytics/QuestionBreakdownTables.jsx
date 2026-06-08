function BreakdownTable({ title, questions, emptyMessage }) {
  if (!questions?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-200 bg-white/80 p-6 text-center text-sm text-slate-600">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <div key={question.question_id} className="rounded-2xl border border-blue-200/70 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              Q{question.question_index}
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-navy-700">
              {question.type_label || question.chart_type}
            </span>
            <span className="text-xs text-slate-500">{question.total_responses} responses</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-navy-900">{question.question_text}</p>
          {question.options?.length ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-blue-100">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/60">
                    <th className="px-3 py-2 font-semibold text-slate-700">Item</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Count</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Percent</th>
                  </tr>
                </thead>
                <tbody>
                  {question.options.map((option) => (
                    <tr key={`${question.question_id}-${option.option_text}`} className="border-b border-blue-50 last:border-b-0">
                      <td className="px-3 py-2 text-slate-700">{option.option_text}</td>
                      <td className="px-3 py-2 text-slate-700">{option.count}</td>
                      <td className="px-3 py-2 text-slate-700">{option.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function QuestionBreakdownTables({ surveyQuestions, standaloneQuestions }) {
  return (
    <div className="space-y-6">
      {surveyQuestions?.length ? (
        <div>
          <h3 className="text-lg font-bold text-navy-900">Survey Responses</h3>
          <p className="mt-1 text-sm text-slate-600">
            Survey items grouped by format. No scoring or correct-answer highlights apply.
          </p>
          <div className="mt-4">
            <BreakdownTable questions={surveyQuestions} />
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="text-lg font-bold text-navy-900">Quiz, Poll & Other Questions</h3>
        <p className="mt-1 text-sm text-slate-600">Standalone session questions outside the survey block.</p>
        <div className="mt-4">
          <BreakdownTable
            questions={standaloneQuestions}
            emptyMessage="No standalone quiz or poll questions in this session."
          />
        </div>
      </div>
    </div>
  )
}
