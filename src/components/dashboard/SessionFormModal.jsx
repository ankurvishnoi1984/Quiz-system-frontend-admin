import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'

const defaultInitial = {
  title: '',
  description: '',
  departmentId: '',
  joinRequirement: 'name',
  enableNavigation: false,
  overallLeaderboard: true,
}

function SessionFormModal({
  open,
  modalTitle,
  mode = 'create',
  departments = [],
  allowDepartmentSelection = true,
  defaultDepartmentId = '',
  initialValues = defaultInitial,
  liveSettingsOnly = false,
  departmentLabel = '',
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [joinRequirement, setJoinRequirement] = useState(defaultInitial.joinRequirement)
  const [enableNavigation, setEnableNavigation] = useState(defaultInitial.enableNavigation)
  const [overallLeaderboard, setOverallLeaderboard] = useState(defaultInitial.overallLeaderboard)

  useEffect(() => {
    if (!open) return
    setJoinRequirement(initialValues.joinRequirement ?? defaultInitial.joinRequirement)
    setEnableNavigation(Boolean(initialValues.enableNavigation))
    setOverallLeaderboard(initialValues.overallLeaderboard !== false)
  }, [open, initialValues])

  const handleSubmit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      title: String(form.get('title') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      departmentId: String(form.get('department') || defaultDepartmentId || ''),
      joinRequirement,
      enableNavigation,
      overallLeaderboard,
    })
  }

  return (
    <Modal open={open} title={modalTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Title</label>
          <input
            name="title"
            key={`title-${initialValues.title}-${open}`}
            defaultValue={initialValues.title ?? ''}
            className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            placeholder="e.g., Weekly Pulse Check"
            required
          />
        </div>
        {!liveSettingsOnly ? (
          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <input
              name="description"
              key={`description-${initialValues.description}-${open}`}
              defaultValue={initialValues.description ?? ''}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="e.g., Friday live polling session"
            />
          </div>
        ) : null}
        <div className={liveSettingsOnly ? 'md:col-span-2' : ''}>
          <label className="text-sm font-semibold text-slate-700">Department</label>
          {mode === 'edit' || !allowDepartmentSelection ? (
            <p className="mt-1 flex h-11 items-center rounded-xl border border-blue-200/70 bg-slate-50 px-3 text-sm text-slate-700">
              {departmentLabel || '—'}
            </p>
          ) : (
            <select
              name="department"
              defaultValue={initialValues.departmentId || defaultDepartmentId}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            >
              {departments.map((dept) => (
                <option key={dept.dept_id} value={dept.dept_id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {!liveSettingsOnly ? (
          <>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Join requirements</label>
              <select
                value={joinRequirement}
                onChange={(e) => setJoinRequirement(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              >
                <option value="anonymous">Anonymous (no name/email)</option>
                <option value="name">Name only</option>
                <option value="name_email">Name + Email</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="question-availability">
                Question availability
              </label>
              <select
                id="question-availability"
                value={enableNavigation ? 'enabled' : 'disabled'}
                onChange={(e) => setEnableNavigation(e.target.value === 'enabled')}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              >
                <option value="disabled">
                  Single active question — one live question at a time, host-led pacing
                </option>
                <option value="enabled">
                  Multiple active questions — participants can access all live questions
                </option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Multiple mode lets you activate several questions at once; participants browse between
                them. Single mode shows only the current live question until the host advances. Timed
                questions in single mode use a shared host countdown — late joiners get only remaining
                time.
              </p>
            </div>
          </>
        ) : (
          <p className="md:col-span-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            This session is live or completed. Only the title and overall leaderboard setting can be
            changed here.
          </p>
        )}
        <div className="md:col-span-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-blue-200/70 bg-white px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Overall leaderboard (Q&A)</p>
              <p className="text-xs text-slate-500">
                Show session-wide rankings to participants on the Q&A page
              </p>
            </div>
            <input
              type="checkbox"
              checked={overallLeaderboard}
              onChange={(e) => setOverallLeaderboard(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
            />
          </label>
        </div>
        <div className="flex items-end gap-2 md:col-span-2 md:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create session'
                : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SessionFormModal
