import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export function PasswordRevealCell({ password }) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const canReveal = Boolean(password)

  return (
    <div
      className="inline-flex min-w-[120px] items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="font-mono text-sm tracking-wider text-slate-700">
        {visible && canReveal ? password : '••••••••'}
      </span>
      {hovered ? (
        <button
          type="button"
          disabled={!canReveal}
          onClick={() => canReveal && setVisible((prev) => !prev)}
          className="rounded-lg border border-blue-200/70 bg-white p-1 text-slate-600 transition hover:bg-blue-50 hover:text-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={
            canReveal
              ? visible
                ? 'Hide password'
                : 'Show password'
              : 'Password available only for users created in this browser'
          }
        >
          {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      ) : null}
    </div>
  )
}
