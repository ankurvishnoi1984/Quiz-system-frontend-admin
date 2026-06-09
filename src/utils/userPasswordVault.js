const STORAGE_KEY = 'user-management-passwords'

function readVault() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeVault(vault) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault))
}

export function getStoredUserPassword(userId) {
  const vault = readVault()
  return vault[String(userId)] || null
}

export function setStoredUserPassword(userId, password) {
  if (!userId || !password) return
  const vault = readVault()
  vault[String(userId)] = password
  writeVault(vault)
}

export function getStoredUserPasswords() {
  return readVault()
}
