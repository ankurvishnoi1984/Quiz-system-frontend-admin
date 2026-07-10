export const SHELL_FILTER_DISABLED_PATHS = [
  '/manage/clients',
  '/manage/departments',
  '/monitor/websockets',
]

export function isShellFilterDisabled(pathname) {
  return SHELL_FILTER_DISABLED_PATHS.includes(pathname)
}

export function filterUsersByShell(users, { clientId, departmentId }) {
  return (users || []).filter((user) => {
    if (clientId && user.client_id != null && String(user.client_id) !== String(clientId)) {
      return false
    }
    if (departmentId && user.dept_id != null && String(user.dept_id) !== String(departmentId)) {
      return false
    }
    return true
  })
}
