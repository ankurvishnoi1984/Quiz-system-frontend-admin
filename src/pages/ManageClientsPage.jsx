import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { useAuthStore } from '../store/authStore'
import { listClientsApi } from '../services/dashboardApi'
import { createClientApi } from '../services/managementApi'

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function ManageClientsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    contact_email: '',
    contact_phone: '',
  })

  const clientsQuery = useQuery({
    queryKey: ['manage-clients'],
    queryFn: () => listClientsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createClientApi(accessToken, payload),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['manage-clients'] })
      queryClient.invalidateQueries({ queryKey: ['shell-clients'] })
      setCreateOpen(false)
      setForm({ name: '', slug: '', contact_email: '', contact_phone: '' })
      setAlert({
        variant: 'success',
        title: 'Client created',
        message: `"${client?.name || 'Client'}" was created successfully.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not create client',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.slug.trim() || !form.contact_email.trim()) return

    createMutation.mutate({
      name: form.name.trim(),
      slug: form.slug.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone.trim() || null,
    })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Manage Clients</h2>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          New Client
        </button>
      </div>

      {clientsQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading clients...
        </div>
      ) : null}

      {clientsQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {clientsQuery.error.message || 'Failed to load clients'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Slug</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Contact email</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Tier</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {(clientsQuery.data || []).map((client) => (
              <tr key={client.client_id} className="border-b border-blue-50 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-navy-900">{client.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{client.slug}</td>
                <td className="px-4 py-3 text-slate-700">{client.contact_email}</td>
                <td className="px-4 py-3 capitalize text-slate-700">{client.subscription_tier || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      client.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {client.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {!clientsQuery.isLoading && !(clientsQuery.data || []).length ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-600">
                  No clients yet. Create your first client to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} title="New Client" onClose={() => !createMutation.isPending && setCreateOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Acme Corporation"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 font-mono text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="acme-corp"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Contact email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="admin@acme.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Contact phone (optional)</label>
            <input
              value={form.contact_phone}
              onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="+1 555 0100"
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
              {createMutation.isPending ? 'Creating…' : 'Create client'}
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

export default ManageClientsPage
