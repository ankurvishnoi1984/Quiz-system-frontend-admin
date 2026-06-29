import { ArrowLeft, LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPasswordApi } from '../services/authApi'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const response = await forgotPasswordApi({ email: email.trim() })
      setSuccessMessage(
        response?.message || response?.data?.message || 'Reset credentials have been sent to your email. Please check your inbox.',
      )
      setEmail('')
    } catch (error) {
      setSubmitError(error.message || 'Unable to process password reset request')
    } finally {
      setLoading(false)
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
          <h1 className="text-2xl font-bold text-navy-900">Forgot password</h1>
          <p className="text-sm text-slate-600">
            Enter your email and we will send you a temporary password to sign in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-modern pl-10"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-gradient mt-2">
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Submit'
            )}
          </button>

          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
        </form>

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-navy-700 transition hover:text-navy-900"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      </section>
    </main>
  )
}

export default ForgotPasswordPage
