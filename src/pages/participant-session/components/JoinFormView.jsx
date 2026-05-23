import { PageCenteredShell } from './PageCenteredShell'

export function JoinFormView({
  hasSessionCodeInUrl,
  sessionCodeInput,
  onSessionCodeChange,
  sessionLookupFailed,
  effectiveSessionCode,
  sessionQueryLoading,
  showJoinDetails,
  session,
  joinRequirement,
  name,
  onNameChange,
  email,
  onEmailChange,
  joinError,
  onSubmit,
}) {
  return (
    <PageCenteredShell maxWidth="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4 text-left">
        <div className="text-center">
          <img src="/logo.svg" alt="Logo" className="mx-auto mb-4 h-12 w-42" />
          <h1 className="text-2xl font-bold text-navy-900">
            {showJoinDetails ? session.title : 'Join a session'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {showJoinDetails
              ? `Session code: ${session.session_code || effectiveSessionCode}`
              : 'Enter your session code to continue'}
          </p>
        </div>

        {!hasSessionCodeInUrl && (
          <div>
            <label className="text-sm font-semibold text-slate-700">Session code</label>
            <input
              value={sessionCodeInput}
              onChange={(e) => onSessionCodeChange(e.target.value.toUpperCase())}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 font-mono text-sm font-semibold tracking-widest text-navy-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Enter session code"
              autoComplete="off"
              spellCheck={false}
            />
            {sessionLookupFailed && effectiveSessionCode ? (
              <p className="mt-2 text-sm font-semibold text-red-700">
                Session not found. Check the code and try again.
              </p>
            ) : null}
            {effectiveSessionCode && sessionQueryLoading ? (
              <p className="mt-2 text-sm text-slate-500">Looking up session...</p>
            ) : null}
          </div>
        )}

        {showJoinDetails && joinRequirement === 'anonymous' ? (
          <div>
            <label className="text-sm font-semibold text-slate-700">Name</label>
            <input
              value="Anonymous"
              disabled
              className="mt-1 h-11 w-full cursor-not-allowed rounded-xl border border-blue-200/70 bg-slate-50 px-3 text-sm text-slate-500"
            />
          </div>
        ) : showJoinDetails ? (
          <>
            <div>
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Enter your name"
              />
            </div>

            {joinRequirement === 'name_email' && (
              <div>
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  placeholder="Enter your email"
                />
              </div>
            )}
          </>
        ) : null}

        {joinError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{joinError}</p>
        )}

        <button
          type="submit"
          disabled={!showJoinDetails}
          className="h-11 w-full rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join
        </button>
      </form>
    </PageCenteredShell>
  )
}
