import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { isAdminRole } from '../../utils/adminRoles'

export function AdminOnlyRoute({ children }) {
  const user = useAuthStore((state) => state.user)

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
