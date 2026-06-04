export function OpenTextResponsesList({ responses, emptyMessage = 'No text responses yet.' }) {
  if (!responses?.length) {
    return (
      <p className="flex h-full min-h-[12rem] items-center justify-center text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    )
  }

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {responses.map((row) => (
        <li
          key={row.id ?? `${row.participant}-${row.text}`}
          className="rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2"
        >
          <p className="text-xs font-semibold text-navy-700">{row.participant}</p>
          <p className="mt-1 text-sm leading-snug text-slate-800">{row.text}</p>
        </li>
      ))}
    </ul>
  )
}
