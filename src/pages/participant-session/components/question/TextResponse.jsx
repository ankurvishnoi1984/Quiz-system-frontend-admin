export function TextResponse({ currentResponse, inputsLocked, onTextChange }) {
  return (
    <div>
      <textarea
        value={currentResponse.textResponse || ''}
        disabled={inputsLocked}
        onChange={(e) => onTextChange(e.target.value.slice(0, 300))}
        className="h-28 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
        placeholder="Type your response..."
      />
      <p className="mt-1 text-right text-xs text-slate-500">{currentResponse.textResponse}/300</p>
    </div>
  )
}
