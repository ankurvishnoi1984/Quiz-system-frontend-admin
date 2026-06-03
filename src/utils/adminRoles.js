export const ADMIN_ROLES = ['super_admin', 'client_admin', 'dept_admin']

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role)
}
