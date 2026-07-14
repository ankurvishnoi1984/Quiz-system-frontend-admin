import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Link2, Smartphone } from 'lucide-react'
import { buildSessionJoinUrl, normalizeSessionCode } from '../../utils/joinUrl'
import { PreviewHeader } from './PreviewShell'

function JoinStep({ step, title, children }) {
  return (
    <div className="flex items-start gap-[clamp(0.75rem,2vw,1.25rem)] rounded-3xl border border-blue-200/70 bg-white/95 px-[clamp(1rem,2.5vw,1.75rem)] py-[clamp(0.85rem,2vh,1.25rem)] shadow-md shadow-navy-900/5">
      <span className="grid size-[clamp(2.25rem,4.5vw,3rem)] shrink-0 place-items-center rounded-2xl bg-navy-900 text-[clamp(1rem,2vw,1.25rem)] font-bold text-white">
        {step}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[clamp(0.85rem,1.5vw,1rem)] font-semibold text-navy-900">{title}</p>
        <div className="mt-1 text-[clamp(0.9rem,1.7vw,1.15rem)] leading-snug text-slate-600">
          {children}
        </div>
      </div>
    </div>
  )
}

export function PreviewJoinSlide({ session }) {
  const sessionTitle = session?.title || 'Live session'
  const sessionCode = normalizeSessionCode(session?.session_code)
  const joinUrl = sessionCode ? buildSessionJoinUrl(sessionCode) : ''
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!joinUrl) {
      setQrDataUrl('')
      return undefined
    }
    QRCode.toDataURL(joinUrl, { margin: 1, width: 360, color: { dark: '#0a1f2e', light: '#ffffff' } })
      .then((data) => {
        if (!cancelled) setQrDataUrl(data)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [joinUrl])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PreviewHeader sessionTitle={sessionTitle} />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(0.5rem,2vw,1.5rem)]">
        <div className="w-full max-w-6xl">
          <div className="mb-[clamp(1rem,3vh,1.75rem)] text-center">
            <p className="text-[clamp(0.75rem,1.4vw,0.95rem)] font-semibold uppercase tracking-[0.3em] text-navy-600/80">
              How to join
            </p>
            <h2 className="mt-2 text-[clamp(1.75rem,5vw,3.25rem)] font-bold leading-tight text-navy-900">
              {sessionTitle}
            </h2>
            <p className="mt-2 text-[clamp(0.95rem,1.8vw,1.2rem)] text-slate-600">
              Scan the QR code or open the link, then enter the session code.
            </p>
          </div>

          <div className="grid items-stretch gap-[clamp(1rem,3vw,2rem)] lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
            <div className="flex flex-col gap-[clamp(0.75rem,2vh,1rem)]">
              <JoinStep step={1} title="Open the join page">
                {joinUrl ? (
                  <p className="break-all font-semibold text-navy-800">{joinUrl}</p>
                ) : (
                  <p>Go to the join page shared by your host.</p>
                )}
              </JoinStep>
              <JoinStep step={2} title="Enter this session code">
                {sessionCode ? (
                  <p className="font-mono text-[clamp(1.75rem,4.5vw,3rem)] font-bold tracking-[0.2em] text-navy-900">
                    {sessionCode}
                  </p>
                ) : (
                  <p>Waiting for session code…</p>
                )}
              </JoinStep>
              <JoinStep step={3} title="Join and wait for the host">
                <p>
                  This screen updates when the host opens a question in Present Mode or selects one
                  on Live Present Mode.
                </p>
              </JoinStep>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-[clamp(0.8rem,1.4vw,0.95rem)] text-slate-500">
                {joinUrl ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Link2 className="size-4 text-sky-700" aria-hidden />
                    Share link ready
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone className="size-4 text-sky-700" aria-hidden />
                  Phone or laptop
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-blue-200/70 bg-white/95 p-[clamp(1rem,2.5vw,1.75rem)] shadow-xl shadow-navy-900/10">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR code to join this session"
                  className="aspect-square w-full max-w-[min(100%,18rem)] rounded-2xl"
                />
              ) : (
                <div className="flex aspect-square w-full max-w-[min(100%,18rem)] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
                  {sessionCode ? 'Generating QR…' : 'No code yet'}
                </div>
              )}
              <p className="mt-4 text-center text-[clamp(0.75rem,1.3vw,0.9rem)] font-semibold uppercase tracking-wider text-slate-500">
                Scan to join
              </p>
              {sessionCode ? (
                <p className="mt-2 font-mono text-[clamp(1.25rem,3vw,1.75rem)] font-bold tracking-[0.18em] text-navy-900">
                  {sessionCode}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
