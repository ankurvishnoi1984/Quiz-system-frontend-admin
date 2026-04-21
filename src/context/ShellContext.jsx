import { createContext, useContext, useMemo, useState } from 'react'

const ShellContext = createContext(null)

export function ShellProvider({ children }) {
  const [client, setClient] = useState('Netcast Services')
  const [department, setDepartment] = useState('Engineering')

  const value = useMemo(
    () => ({
      client,
      setClient,
      department,
      setDepartment,
      clients: ['Netcast Services', 'Acme Corp', 'Globex'],
      departments: ['Engineering', 'Sales', 'Operations', 'HR'],
    }),
    [client, department],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used within ShellProvider')
  return ctx
}

