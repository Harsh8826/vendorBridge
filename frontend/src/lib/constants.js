export const ROLES = {
  ADMIN: 'admin',
  PROCUREMENT: 'procurement_officer',
  MANAGER: 'manager',
  VENDOR: 'vendor',
}

export const ROLE_LABELS = {
  admin: 'Admin',
  procurement_officer: 'Procurement Officer',
  manager: 'Manager',
  vendor: 'Vendor',
}

export const STATUS_COLORS = {
  draft: 'gray',
  published: 'blue',
  closed: 'gray',
  cancelled: 'red',
  active: 'green',
  inactive: 'gray',
  blacklisted: 'red',
  pending: 'yellow',
  submitted: 'blue',
  under_review: 'yellow',
  accepted: 'green',
  rejected: 'red',
  revised: 'purple',
  approved: 'green',
  issued: 'blue',
  acknowledged: 'green',
  completed: 'green',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
}

export const STAFF_ROLES = [ROLES.ADMIN, ROLES.PROCUREMENT, ROLES.MANAGER]
export const WRITE_ROLES = [ROLES.ADMIN, ROLES.PROCUREMENT]

export function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date) {
  if (!date) return '—'
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  return formatDate(date)
}

export const VENDOR_CATEGORIES_FALLBACK = [
  'IT & Software', 'Office Supplies', 'Furniture', 'Raw Materials', 'Services', 'Equipment',
]
