const lockedFieldClass =
  'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70'

export function WordCloudInput({
  tagsInput,
  currentResponse,
  inputsLocked,
  onTagsInputChange,
  onAddTag,
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={tagsInput}
          disabled={inputsLocked}
          onChange={(e) => onTagsInputChange(e.target.value)}
          className={`h-11 flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 ${lockedFieldClass}`}
          placeholder={inputsLocked ? 'Adding words is closed' : 'Type a word and add'}
        />
        <button
          type="button"
          disabled={inputsLocked}
          onClick={onAddTag}
          aria-disabled={inputsLocked}
          className={`h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:pointer-events-none disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70`}
        >
          Add
        </button>
      </div>
      {inputsLocked ? (
        <p className="text-xs font-medium text-slate-500">
          You can&apos;t add more words for this question.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(currentResponse.tags || []).map((t, idx) => (
          <span
            key={`${t}-${idx}`}
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-navy-700"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
