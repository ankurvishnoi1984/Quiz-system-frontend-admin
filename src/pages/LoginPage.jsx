import { Eye, EyeOff, LoaderCircle, Lock, User } from 'lucide-react'
import { useState } from 'react'

function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 900)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-sky-50 via-white to-indigo-50/80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(79,70,229,0.12),transparent_40%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 right-8 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 left-6 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />

      <section className="glass-card relative w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">Host Portal</p>
          <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Welcome back</h1>
          <p className="text-sm text-slate-600">Sign in to manage your quiz, poll, and survey sessions.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
              Email / Username
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="input-modern pl-10"
                placeholder="you@company.com"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-modern pl-10 pr-12"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 bg-white text-blue-700 focus:ring-blue-500/40"
              />
              Remember Me
            </label>
            <a href="#" className="text-sm font-medium text-blue-700 transition hover:text-blue-900">
              Forgot password?
            </a>
          </div>

          <button type="submit" disabled={loading} className="btn-gradient mt-2">
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
