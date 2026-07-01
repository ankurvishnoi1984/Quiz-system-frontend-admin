import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { listClientsApi, listDepartmentsApi } from '../services/dashboardApi'

const ShellContext = createContext(null)

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
    if (!departmentsQuery.data?.length) return
    const isValidDept =
      departmentId && departmentsQuery.data.some((d) => String(d.dept_id) === String(departmentId))
    if (!isValidDept) {
      const firstDept = departmentsQuery.data[0]
      setDepartmentId(String(firstDept.dept_id))
      setDepartment(firstDept.name)
    }
  }, [departmentsQuery.data, departmentId])

  useEffect(() => {
    if (isSuperAdmin) return
    if (!clientId && user?.client_id) {
      setClientId(String(user.client_id))
    }
    if (!departmentId && user?.dept_id) {
      const matchesClient = departmentsQuery.data?.some(
        (d) => String(d.dept_id) === String(user.dept_id),
      )
      if (!departmentsQuery.data?.length || matchesClient) {
        setDepartmentId(String(user.dept_id))
      }
    }
  }, [user?.client_id, user?.dept_id, isSuperAdmin, clientId, departmentId, departmentsQuery.data])

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
