export const ADMIN_ROLES = ['super_admin', 'client_admin', 'dept_admin']

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role)
}

/** Roles that can pick any department in the host workspace navbar (within their scope). */
export function canSwitchShellDepartment(role) {
  return role === 'super_admin' || role === 'client_admin'
}
