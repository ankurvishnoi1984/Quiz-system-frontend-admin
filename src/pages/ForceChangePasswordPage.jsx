import { Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

function ForceChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const changePassword = useAuthStore((state) => state.changePassword)
  const loading = useAuthStore((state) => state.isLoading)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    if (newPassword.length < 8) {
      setSubmitError('New password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('New passwords do not match')
      return
    }

    try {
      await changePassword({ newPassword })
    } catch (error) {
      setSubmitError(error.message || 'Unable to update password')
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100/80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(27,75,107,0.12),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(200,35,44,0.06),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(27,75,107,0.08),transparent_40%)]" />

      <section className="glass-card relative w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 space-y-2 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <img src="/log5.png" alt="Company logo" className="h-16 w-auto max-w-[220px] object-contain sm:h-20" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy-700">Host Portal</p>
          <h1 className="text-2xl font-bold text-navy-900">Set a new password</h1>
          <p className="text-sm text-slate-600">
            You signed in with a temporary password. Choose a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
              New password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="input-modern pl-10 pr-12"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input-modern pl-10 pr-12"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-gradient mt-2">
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update password'
            )}
          </button>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        </form>
      </section>
    </main>
  )
}

export default ForceChangePasswordPage
