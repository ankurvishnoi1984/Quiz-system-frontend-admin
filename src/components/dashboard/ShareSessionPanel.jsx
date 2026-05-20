import { Link2, QrCode, Hash } from 'lucide-react'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getSessionQrApi } from '../../services/dashboardApi'
import {
  buildGenericJoinUrl,
  buildSessionJoinUrl,
  normalizeSessionCode,
  resolveSessionJoinUrl,
} from '../../utils/joinUrl'

const SHARE_TABS = [
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'qr', label: 'QR code', icon: QrCode },
  { id: 'code', label: 'Session code', icon: Hash },
]

function CopyButton({ value, disabled, className = '' }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      disabled={disabled || !value}
      onClick={() => {
        if (!value) return
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className={`h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        copied
          ? 'scale-95 border-green-300 bg-green-100 text-green-700'
          : 'border-blue-200 bg-white text-slate-700 hover:bg-blue-50'
      } ${className}`}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

export default function ShareSessionPanel({ session, accessToken, sessionDbId }) {
  const [shareTab, setShareTab] = useState('link')
  const [shareJoinUrl, setShareJoinUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')

  const sessionCode = normalizeSessionCode(session?.session_code)
  const genericJoinUrl = buildGenericJoinUrl()

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      if (!session) {
        setShareJoinUrl('')
        setQrDataUrl('')
        return
      }

      const code = sessionCode || String(session.id || '')
      let link = buildSessionJoinUrl(code)
      if (accessToken && sessionDbId) {
        try {
          const qrPayload = await getSessionQrApi(accessToken, sessionDbId)
          link = resolveSessionJoinUrl(qrPayload?.join_url, code)
        } catch {
          // Use local join URL when QR endpoint fails.
        }
      }

      if (cancelled) return
      setShareJoinUrl(link)
      const data = await QRCode.toDataURL(link, { margin: 1, width: 280 })
      if (!cancelled) setQrDataUrl(data)
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [session, accessToken, sessionDbId, sessionCode])

  if (!session) return null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Session</p>
        <p className="mt-1 text-lg font-bold text-navy-900">{session.title}</p>
        {sessionCode ? (
          <p className="mt-1 text-sm text-slate-600">
            Session code:{' '}
            <span className="font-mono font-semibold tracking-widest text-navy-800">{sessionCode}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Share link for participants to join this session.</p>
        )}
      </div>

      <div className="inline-flex rounded-xl border border-blue-200/70 bg-white p-0.5 shadow-sm">
        {SHARE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setShareTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              shareTab === id
                ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow'
                : 'text-slate-600 hover:bg-blue-50'
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {shareTab === 'link' && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Direct join link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareJoinUrl}
              className="h-11 flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none"
            />
            <CopyButton value={shareJoinUrl} />
          </div>
          <p className="text-xs text-slate-500">Opens this session directly — no code entry needed.</p>
        </div>
      )}

      {shareTab === 'qr' && (
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">QR encodes the direct join link</label>
            <input
              readOnly
              value={shareJoinUrl}
              className="h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none"
            />
            <CopyButton value={shareJoinUrl} className="w-full" />
          </div>
          <div className="rounded-2xl border border-blue-200/70 bg-white p-3">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Session QR" className="mx-auto h-[240px] w-[240px]" />
            ) : (
              <div className="grid h-[240px] place-items-center text-sm text-slate-500">Generating QR...</div>
            )}
          </div>
        </div>
      )}

      {shareTab === 'code' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Join page (no code in URL)</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={genericJoinUrl}
                className="h-11 flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none"
              />
              <CopyButton value={genericJoinUrl} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Session code</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={sessionCode}
                className="h-11 flex-1 rounded-xl border border-blue-200/70 bg-white px-3 font-mono text-sm font-semibold tracking-widest text-navy-900 outline-none"
              />
              <CopyButton value={sessionCode} disabled={!sessionCode} />
            </div>
          </div>
          <p className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs leading-relaxed text-slate-600">
            Share the join page link and session code separately. Participants open the join page, enter the code,
            then provide their name{session.join_type === 'name_email' ? ' and email' : ''} as required.
          </p>
        </div>
      )}
    </div>
  )
}
