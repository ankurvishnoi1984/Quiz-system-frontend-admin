import { Check, Copy, Download, Hash, Link2, QrCode } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function downloadDataUrl(filename, dataUrl) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function qrDownloadFilename(sessionCode, sessionId) {
  const slug = (sessionCode || `session-${sessionId || 'qr'}`).toLowerCase()
  return `quiz-qr-${slug}.png`
}

function buildShareLinkText({ title, sessionCode, description, joinUrl }) {
  const lines = ["You're invited to join a quiz session!", '', `Session: ${title}`]
  if (sessionCode) lines.push(`Session code: ${sessionCode}`)
  if (description?.trim()) lines.push(`Description: ${description.trim()}`)
  lines.push('', `Join link: ${joinUrl}`, '', 'Open the link to join directly — no code entry needed.')
  return lines.join('\n')
}

function QrImageActions({ dataUrl, filename }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const actionClass =
    'inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        disabled={!dataUrl}
        onClick={async () => {
          if (!dataUrl) return
          setCopyError(false)
          try {
            if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
              throw new Error('Clipboard API unavailable')
            }
            const blob = await dataUrlToBlob(dataUrl)
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            setCopyError(true)
            setTimeout(() => setCopyError(false), 2000)
          }
        }}
        className={`${actionClass} ${
          copied
            ? 'border-green-300 bg-green-100 text-green-700'
            : copyError
              ? 'border-red-300 bg-red-50 text-red-700'
              : ''
        }`}
      >
        {copied ? 'Copied ✓' : copyError ? 'Copy failed' : 'Copy QR'}
      </button>
      <button
        type="button"
        disabled={!dataUrl}
        onClick={() => {
          if (!dataUrl) return
          downloadDataUrl(filename, dataUrl)
        }}
        className={actionClass}
      >
        <Download className="size-4" />
        Download
      </button>
    </div>
  )
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = (value) => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return { copied, copy }
}

function CopyButton({ value, disabled, className = '', label = 'Copy', copiedLabel = 'Copied ✓' }) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <button
      type="button"
      disabled={disabled || !value}
      onClick={() => copy(value)}
      className={`h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        copied
          ? 'scale-95 border-green-300 bg-green-100 text-green-700'
          : 'border-blue-200 bg-white text-slate-700 hover:bg-blue-50'
      } ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  )
}

function CopyIconButton({
  value,
  disabled,
  ariaLabel = 'Copy link',
  showLabel = false,
  attached = false,
}) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <button
      type="button"
      disabled={disabled || !value}
      aria-label={copied ? 'Copied' : ariaLabel}
      title={copied ? 'Copied' : ariaLabel}
      onClick={() => copy(value)}
      className={`inline-flex shrink-0 items-center justify-center gap-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        attached
          ? `h-11 border-l border-blue-200/70 px-3 text-xs font-semibold ${
              copied
                ? 'bg-green-50 text-green-700'
                : 'bg-blue-50/50 text-navy-700 hover:bg-blue-50'
            }`
          : `h-9 w-9 rounded-lg border ${
              copied
                ? 'border-green-300 bg-green-100 text-green-700'
                : 'border-blue-200 bg-white text-slate-600 hover:bg-blue-50'
            }`
      }`}
    >
      {copied ? <Check className="size-4 shrink-0" /> : <Copy className="size-4 shrink-0" />}
      {showLabel ? <span>{copied ? 'Copied' : 'Copy link'}</span> : null}
    </button>
  )
}

export default function ShareSessionPanel({ session, accessToken, sessionDbId }) {
  const [shareTab, setShareTab] = useState('link')
  const [shareJoinUrl, setShareJoinUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')

  const sessionCode = normalizeSessionCode(session?.session_code)
  const genericJoinUrl = buildGenericJoinUrl()
  const sessionDescription = session?.description || ''

  const shareLinkText = useMemo(
    () =>
      buildShareLinkText({
        title: session?.title || 'Quiz session',
        sessionCode,
        description: sessionDescription,
        joinUrl: shareJoinUrl,
      }),
    [session?.title, sessionCode, sessionDescription, shareJoinUrl],
  )

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
      {shareTab !== 'link' && (
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
      )}

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
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700">Share with participants</label>
          <div className="space-y-3 rounded-2xl border border-blue-200/70 bg-white p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Session</p>
              <p className="mt-1 text-base font-bold text-navy-900">{session.title}</p>
            </div>
            {sessionCode ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Session code</p>
                <p className="mt-1 font-mono text-sm font-semibold tracking-widest text-navy-800">{sessionCode}</p>
              </div>
            ) : null}
            {sessionDescription.trim() ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Description</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{sessionDescription.trim()}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Join link</p>
              <div className="mt-1 flex overflow-hidden rounded-xl border border-blue-200/70 bg-white">
                <input
                  readOnly
                  value={shareJoinUrl || 'Generating link…'}
                  className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-slate-700 outline-none"
                  aria-label="Join link"
                />
                <CopyIconButton
                  value={shareJoinUrl}
                  disabled={!shareJoinUrl}
                  attached
                  showLabel
                />
              </div>
            </div>
          </div>
          <CopyButton
            value={shareLinkText}
            disabled={!shareJoinUrl}
            label="Copy all"
            className="w-full"
          />
          <p className="text-xs text-slate-500">
            Use Copy link on the field for the URL only, or Copy all for session details plus the join link.
          </p>
        </div>
      )}

      {shareTab === 'qr' && (
        <div className="mx-auto max-w-[304px] rounded-2xl border border-blue-200/70 bg-white p-3">
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="Session QR" className="mx-auto h-[240px] w-[240px]" />
              <QrImageActions
                dataUrl={qrDataUrl}
                filename={qrDownloadFilename(sessionCode, session.id)}
              />
            </>
          ) : (
            <div className="grid h-[240px] place-items-center text-sm text-slate-500">Generating QR...</div>
          )}
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
