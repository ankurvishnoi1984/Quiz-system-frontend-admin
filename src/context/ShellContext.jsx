import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { listClientsApi, listDepartmentsApi } from '../services/dashboardApi'

const ShellContext = createContext(null)

function findDepartment(departments, deptId) {
  if (!deptId || !departments?.length) return null
  return departments.find((d) => String(d.dept_id) === String(deptId)) || null
}

export function ShellProvider({ children }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const isSuperAdmin = user?.role === 'super_admin'
  const isClientAdmin = user?.role === 'client_admin'

  const [client, setClient] = useState('')
  const [clientId, setClientId] = useState('')
  const [department, setDepartment] = useState('')
  const [departmentId, setDepartmentId] = useState('')

  const resolvedClientId = isSuperAdmin
    ? clientId || user?.client_id || null
    : user?.client_id || null

  const clientsQuery = useQuery({
    queryKey: ['shell-clients'],
    queryFn: () => listClientsApi(accessToken),
    enabled: Boolean(accessToken && isSuperAdmin),
  })

  const departmentsQuery = useQuery({
    queryKey: ['shell-departments', resolvedClientId, user?.role],
    queryFn: () => listDepartmentsApi(accessToken, resolvedClientId || null),
    enabled: Boolean(accessToken && (!isClientAdmin || resolvedClientId)),
  })

  useEffect(() => {
    if (!isSuperAdmin) return
    if (!clientId && clientsQuery.data?.length) {
      const firstClient = clientsQuery.data[0]
      setClientId(String(firstClient.client_id))
      setClient(firstClient.name)
    }
  }, [isSuperAdmin, clientId, clientsQuery.data])

  useEffect(() => {
    if (isSuperAdmin) return
    if (!clientId && user?.client_id) {
      setClientId(String(user.client_id))
    }
  }, [isSuperAdmin, clientId, user?.client_id])

  // Keep selected department id + name aligned with the loaded department list.
  useEffect(() => {
    const departments = departmentsQuery.data || []
    if (!departments.length) return

    const selected = findDepartment(departments, departmentId)
    if (selected) {
      const nextName = selected.name || ''
      if (department !== nextName) setDepartment(nextName)
      return
    }

    // Prefer the signed-in user's department when it belongs to this client list.
    const userDept = !isSuperAdmin ? findDepartment(departments, user?.dept_id) : null
    const fallback = userDept || departments[0]
    if (!fallback) return

    setDepartmentId(String(fallback.dept_id))
    setDepartment(fallback.name || '')
  }, [departmentsQuery.data, departmentId, department, user?.dept_id, isSuperAdmin])

  // When super admin switches client, drop a department that no longer exists.
  useEffect(() => {
    if (!isSuperAdmin) return
    const departments = departmentsQuery.data
    if (!departments) return
    if (!departmentId) return
    if (findDepartment(departments, departmentId)) return
    setDepartmentId('')
    setDepartment('')
  }, [isSuperAdmin, clientId, departmentsQuery.data, departmentId])

  const value = useMemo(
    () => ({
      client,
      setClient,
      clientId,
      setClientId,
      department,
      setDepartment,
      departmentId,
      setDepartmentId,
      clients: clientsQuery.data || [],
      departments: departmentsQuery.data || [],
      isSuperAdmin,
      clientsLoading: clientsQuery.isLoading,
      departmentsLoading: departmentsQuery.isLoading,
    }),
    [
      client,
      clientId,
      department,
      departmentId,
      clientsQuery.data,
      departmentsQuery.data,
      isSuperAdmin,
      clientsQuery.isLoading,
      departmentsQuery.isLoading,
    ],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used within ShellProvider')
  return ctx
}
