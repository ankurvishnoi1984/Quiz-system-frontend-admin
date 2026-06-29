import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { PasswordRevealCell } from '../components/management/PasswordRevealCell'
import { useShell } from '../context/ShellContext'
import { useAuthStore } from '../store/authStore'
import { listClientsApi, listDepartmentsApi } from '../services/dashboardApi'
import { listUsersApi, registerUserApi } from '../services/managementApi'
import { filterUsersByShell } from '../utils/shellFilterPaths'
import { getStoredUserPasswords, setStoredUserPassword } from '../utils/userPasswordVault'

const ROLE_OPTIONS = [
  // { value: 'super_admin', label: 'Super admin' },
  { value: 'client_admin', label: 'Client admin' },
  { value: 'dept_admin', label: 'Department admin' },
  { value: 'host', label: 'Host' },
]

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((role) => [role.value, role.label]))

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'host',
  client_id: '',
  dept_id: '',
}

function ManageUsersPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const { clientId, departmentId } = useShell()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [passwordVault, setPasswordVault] = useState(() => getStoredUserPasswords())

  const usersQuery = useQuery({
    queryKey: ['manage-users'],
    queryFn: () => listUsersApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const clientsQuery = useQuery({
    queryKey: ['manage-clients'],
    queryFn: () => listClientsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const departmentsQuery = useQuery({
    queryKey: ['manage-user-departments', form.client_id],
    queryFn: () => listDepartmentsApi(accessToken, form.client_id),
    enabled: Boolean(accessToken && form.client_id),
  })

  const clientsById = useMemo(() => {
    const map = new Map()
    for (const client of clientsQuery.data || []) {
      map.set(String(client.client_id), client.name)
    }
    return map
  }, [clientsQuery.data])

  const allDepartmentsQuery = useQuery({
    queryKey: ['manage-all-departments'],
    queryFn: () => listDepartmentsApi(accessToken),
    enabled: Boolean(accessToken),
  })

  const tableDepartmentsById = useMemo(() => {
    const map = new Map()
    for (const dept of allDepartmentsQuery.data || []) {
      map.set(String(dept.dept_id), dept.name)
    }
    return map
  }, [allDepartmentsQuery.data])

  const filteredUsers = useMemo(
    () => filterUsersByShell(usersQuery.data, { clientId, departmentId }),
    [usersQuery.data, clientId, departmentId],
  )

  const needsClient = ['client_admin', 'dept_admin', 'host'].includes(form.role)
  const needsDepartment = ['dept_admin', 'host'].includes(form.role)

  const createMutation = useMutation({
    mutationFn: (payload) => registerUserApi(payload),
    onSuccess: (result, variables) => {
      const userId = result?.user?.user_id
      if (userId && variables.password) {
        setStoredUserPassword(userId, variables.password)
        setPasswordVault(getStoredUserPasswords())
      }
      queryClient.invalidateQueries({ queryKey: ['manage-users'] })
      setCreateOpen(false)
      setForm(emptyForm)
      setAlert({
        variant: 'success',
        title: 'User created',
        message: `"${result?.user?.full_name || 'User'}" was registered successfully.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error) => {
      setAlert({
        variant: 'error',
        title: 'Could not create user',
        message: error.message || 'Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return
    if (needsClient && !form.client_id) return
    if (needsDepartment && !form.dept_id) return

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    }

    if (needsClient) payload.client_id = Number(form.client_id)
    if (needsDepartment) payload.dept_id = Number(form.dept_id)

    createMutation.mutate(payload)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">User Management</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({
              ...emptyForm,
              client_id: clientId || '',
              dept_id: departmentId || '',
            })
            setCreateOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          New User
        </button>
      </div>

      {usersQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading users...
        </div>
      ) : null}

      {usersQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {usersQuery.error.message || 'Failed to load users'}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-blue-100 bg-blue-50/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Password</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Client</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Department</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.user_id} className="border-b border-blue-50 last:border-b-0">
                <td className="px-4 py-3 font-semibold text-navy-900">{user.full_name}</td>
                <td className="px-4 py-3 text-slate-700">{user.email}</td>
                <td className="px-4 py-3">
                  <PasswordRevealCell password={passwordVault[String(user.user_id)]} />
                </td>
                <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[user.role] || user.role}</td>
                <td className="px-4 py-3 text-slate-700">
                  {user.client_id
                    ? clientsById.get(String(user.client_id)) || `Client ${user.client_id}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.dept_id
                    ? tableDepartmentsById.get(String(user.dept_id)) || `Dept ${user.dept_id}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      user.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {!usersQuery.isLoading && !filteredUsers.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-600">
                  {(usersQuery.data || []).length
                    ? 'No users match the selected client or department.'
                    : 'No users found.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={createOpen}
        title="New User"
        onClose={() => !createMutation.isPending && setCreateOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="jane@example.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Role</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  client_id: '',
                  dept_id: '',
                }))
              }
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          {needsClient ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Client</label>
              <select
                value={form.client_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    client_id: e.target.value,
                    dept_id: '',
                  }))
                }
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
          {needsDepartment ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Department</label>
              <select
                value={form.dept_id}
                onChange={(e) => setForm((prev) => ({ ...prev, dept_id: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                required
                disabled={!form.client_id}
              >
                <option value="">Select department</option>
                {(departmentsQuery.data || []).map((dept) => (
                  <option key={dept.dept_id} value={dept.dept_id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
              {createMutation.isPending ? 'Creating…' : 'Create user'}
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

export default ManageUsersPage
