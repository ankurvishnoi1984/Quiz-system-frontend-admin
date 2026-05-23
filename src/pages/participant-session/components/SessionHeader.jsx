export function SessionHeader({ session, joinedUser, step, onStepChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-navy-900">{session.title}</h1>
        <p className="text-sm text-slate-600">
          {joinedUser?.anonymous
            ? 'Anonymous participant'
            : `${joinedUser?.name}${joinedUser?.email ? ` • ${joinedUser.email}` : ''}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onStepChange('active')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 'active' ? 'bg-blue-100 text-blue-900' : 'border border-blue-200/70 bg-white text-slate-700'}`}
        >
          Question
        </button>
        <button
          type="button"
          onClick={() => onStepChange('qa')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 'qa' ? 'bg-blue-100 text-blue-900' : 'border border-blue-200/70 bg-white text-slate-700'}`}
        >
          Q&A
        </button>
      </div>
    </div>
  )
}
