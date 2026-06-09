import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { useAuthStore } from '../store/authStore'
import { listClientsApi, listDepartmentsApi } from '../services/dashboardApi'
import { createDepartmentApi } from '../services/managementApi'

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function ManageDepartmentsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const isSuperAdmin = user?.role === 'super_admin'
  const canCreate = ['super_admin', 'client_admin'].includes(user?.role)

  const [createOpen, setCreateOpen] = useState(false)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState({
    client_id: '',
    name: '',
    slug: '',
    description: '',
  })

  const clientsQuery = useQuery({
    queryKey: ['manage-clients'],
    queryFn: () => listClientsApi(accessToken),
    enabled: Boolean(accessToken && isSuperAdmin),
  })

  const departmentsQuery = useQuery({
    queryKey: ['manage-departments', user?.client_id],
    queryFn: () =>
      listDepartmentsApi(accessToken, isSuperAdmin ? null : user?.client_id),
    enabled: Boolean(accessToken),
  })

  const clientsById = useMemo(() => {
    const map = new Map()
    for (const client of clientsQuery.data || []) {
      map.set(String(client.client_id), client.name)
    }
    return map
  }, [clientsQuery.data])

  const createMutation = useMutation({
    mutationFn: (payload) => createDepartmentApi(accessToken, payload),
    onSuccess: (department) => {
      queryClient.invalidateQueries({ queryKey: ['manage-departments'] })
      queryClient.invalidateQueries({ queryKey: ['shell-departments'] })
      setCreateOpen(false)
      setForm({
        client_id: isSuperAdmin ? '' : String(user?.client_id || ''),
        name: '',
        slug: '',
        description: '',
      })
      setAlert({
        variant: 'success',
        title: 'Department created',
        message: `"${department?.name || 'Department'}" was created successfully.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not create department',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const openCreateModal = () => {
    setForm({
      client_id: isSuperAdmin ? '' : String(user?.client_id || ''),
      name: '',
      slug: '',
      description: '',
    })
    setCreateOpen(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const clientId = isSuperAdmin ? form.client_id : String(user?.client_id || '')
    if (!clientId || !form.name.trim() || !form.slug.trim()) return

    createMutation.mutate({
      client_id: Number(clientId),
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Manage Departments</h2>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
          >
            <Plus className="size-4" />
            New Department
          </button>
        ) : null}
      </div>

      {departmentsQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading departments...
        </div>
      ) : null}

      {departmentsQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {departmentsQuery.error.message || 'Failed to load departments'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Slug</th>
              {isSuperAdmin ? (
                <th className="px-4 py-3 font-semibold text-slate-700">Client</th>
              ) : null}
              <th className="px-4 py-3 font-semibold text-slate-700">Description</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {(departmentsQuery.data || []).map((dept) => (
              <tr key={dept.dept_id} className="border-b border-blue-50 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-navy-900">{dept.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{dept.slug}</td>
                {isSuperAdmin ? (
                  <td className="px-4 py-3 text-slate-700">
                    {dept.Client?.name ||
                      clientsById.get(String(dept.client_id)) ||
                      `Client ${dept.client_id}`}
                  </td>
                ) : null}
                <td className="px-4 py-3 text-slate-600">{dept.description || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      dept.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {!departmentsQuery.isLoading && !(departmentsQuery.data || []).length ? (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-10 text-center text-slate-600">
                  No departments found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={createOpen}
        title="New Department"
        onClose={() => !createMutation.isPending && setCreateOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSuperAdmin ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                required
              >
                <option value="">Select client</option>
                {(clientsQuery.data || []).map((client) => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="text-sm font-semibold text-slate-700">Name</label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: prev.slug || slugify(name),
                }))
              }}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Engineering"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 font-mono text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="engineering"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Optional department description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => setCreateOpen(false)}
              className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating…' : 'Create department'}
            </button>
          </div>
        </form>
      </Modal>

      <HostAlertModal
        open={Boolean(alert)}
        variant={alert?.variant ?? 'success'}
        title={alert?.title ?? ''}
        message={alert?.message ?? ''}
        confirmLabel={alert?.confirmLabel ?? 'OK'}
        onClose={() => setAlert(null)}
      />
    </section>
  )
}

export default ManageDepartmentsPage
