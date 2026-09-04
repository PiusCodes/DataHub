const STORAGE_KEYS = {
  users: 'datahub.users',
  datasets: 'datahub.datasets',
  requests: 'datahub.requests',
  purchases: 'datahub.purchases',
}

const ADMIN_ACCOUNT = {
  id: 'user-admin',
  email: 'admin@datahub.local',
  password: 'Admin@123',
  role: 'admin',
  createdAt: '2026-03-27T00:00:00.000Z',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso() {
  return new Date().toISOString()
}

function formatRelativeDate(iso) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

function ensureSeededUsers() {
  const users = read(STORAGE_KEYS.users, [])
  if (!users.find((user) => user.email === ADMIN_ACCOUNT.email)) {
    users.push(ADMIN_ACCOUNT)
    write(STORAGE_KEYS.users, users)
  }
  return users
}

export function getCurrentUser() {
  const token = localStorage.getItem('accessToken')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''))
    return { email: payload.email, role: payload.role }
  } catch (e) {
    return null
  }
}

export function signUpLocalUser() {
  throw new Error('Local sign up is no longer available.')
}

export function signInLocalUser() {
  throw new Error('Local sign in is no longer available.')
}

export function persistSession() {
  throw new Error('Local session persistence is no longer available.')
}

export function listDatasetsLocal() {
  return read(STORAGE_KEYS.datasets, [])
}

export function createDatasetLocal({ title, description, license, price, fileName, ownerEmail }) {
  const createdAt = nowIso()
  const quality = Math.max(72, Math.min(97, 80 + Math.floor(Math.random() * 15)))
  const dataset = {
    id: uniqueId('dataset'),
    title,
    description: description || 'No description provided.',
    license,
    price: Number(price || 0),
    quality,
    preview: `Local preview generated for ${title}.`,
    tags: [license, 'Local Upload'],
    records: fileName ? `Source file: ${fileName}` : 'Local browser upload',
    updated: `Listed ${formatRelativeDate(createdAt)}`,
    access: 'Available for local demo purchase',
    ownerEmail,
    createdAt,
    status: 'listed',
  }

  const datasets = listDatasetsLocal()
  datasets.unshift(dataset)
  write(STORAGE_KEYS.datasets, datasets)
  return dataset
}

export function createRequestLocal({ title, desc, budget, requesterEmail }) {
  const request = {
    id: uniqueId('request'),
    title,
    desc,
    budget,
    requesterEmail,
    stage: 'Submitted',
    createdAt: nowIso(),
  }

  const requests = read(STORAGE_KEYS.requests, [])
  requests.unshift(request)
  write(STORAGE_KEYS.requests, requests)
  return request
}

export function listRequestsLocal() {
  return read(STORAGE_KEYS.requests, [])
}

export function createPurchaseLocal(datasetId) {
  const purchases = read(STORAGE_KEYS.purchases, [])
  const purchase = {
    id: uniqueId('purchase'),
    datasetId,
    createdAt: nowIso(),
  }
  purchases.unshift(purchase)
  write(STORAGE_KEYS.purchases, purchases)
  return purchase
}

export function isPurchasedLocal(datasetId) {
  const purchases = read(STORAGE_KEYS.purchases, [])
  return purchases.some((purchase) => purchase.datasetId === datasetId)
}

export function getAdminCredentialsHint() {
  return {
    email: ADMIN_ACCOUNT.email,
    password: ADMIN_ACCOUNT.password,
  }
}
