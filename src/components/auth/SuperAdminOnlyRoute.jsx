import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function SuperAdminOnlyRoute({ children }) {
  const user = useAuthStore((state) => state.user)

  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
