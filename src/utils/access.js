function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function getStoredRole() {
  return normalize(localStorage.getItem('userRole'))
}

export function getStoredEmail() {
  return normalize(localStorage.getItem('userEmail'))
}

export function isSignedIn() {
  return Boolean(getStoredEmail())
}

export function getDeveloperAllowlist() {
  const raw = import.meta.env.VITE_DEVELOPER_EMAILS || ''
  return raw
    .split(',')
    .map((value) => normalize(value))
    .filter(Boolean)
}

export function isDeveloperAllowed() {
  const email = getStoredEmail()
  if (!email) return false

  const allowlist = getDeveloperAllowlist()
  return allowlist.includes(email)
}
